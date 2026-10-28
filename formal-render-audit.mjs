import {readFile,realpath} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createFormalDraftLessonLoader,FIRST_JOURNEY_PAGES} from './formal-first-journey-content.mjs';
const footer='Draft review only. Reading does not grant enrollment, exercise authorization, completion or an award. Report intake and reviewer actions are unavailable.';
export function fencedIntervals(raw){
 if(typeof raw!=='string')throw new Error('Text required');
 const ranges=[];let open=null,offset=0;
 for(const line of raw.match(/[^\n]*\n|[^\n]+$/g)||[]){
  const text=line.replace(/\r?\n$/,'');const m=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
  if(m){if(!open){if(m[1][0]!=='`'||!m[2].includes('`'))open={start:offset,marker:m[1][0],length:m[1].length};}
   else if(m[1][0]===open.marker&&m[1].length>=open.length&&!m[2].trim()){ranges.push({start:open.start,end:offset+text.length,closed:true});open=null;}}
  offset+=line.length;
 }
 if(open)ranges.push({start:open.start,end:raw.length,closed:false});return ranges;
}
export function inspectPagination(raw,fragments){
 if(typeof raw!=='string'||!Array.isArray(fragments)||!fragments.length||fragments.some(x=>typeof x!=='string'||!x)||fragments.join('')!==raw)throw new Error('Exact nonempty source fragments required');
 const ranges=fencedIntervals(raw),cuts=[];let offset=0;
 for(const fragment of fragments.slice(0,-1)){offset+=fragment.length;cuts.push(offset);}
 return{cutOffsetsUtf16:cuts,fenceCutOffsetsUtf16:cuts.filter(c=>ranges.some(r=>r.start<c&&c<r.end)),lineCutOffsetsUtf16:cuts.filter(c=>raw[c]!=='\n'&&raw[c-1]!=='\n'),surrogateCutOffsetsUtf16:cuts.filter(c=>/[\uD800-\uDBFF]/.test(raw[c-1])&&/[\uDC00-\uDFFF]/.test(raw[c])),unclosedSourceFences:ranges.filter(r=>!r.closed).length};
}
export function extractMarkdownLinks(raw){
 const ranges=fencedIntervals(raw),links=[];
 for(const m of raw.matchAll(/\[[^\]\r\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)){
  if(ranges.some(r=>r.start<=m.index&&m.index<r.end))continue;
  let target=m[1];if(target.startsWith('<')&&target.endsWith('>'))target=target.slice(1,-1);
  const kind=target.startsWith('#')?'fragment':/^(?:https?:|mailto:|\/\/)/i.test(target)?'external':/^[a-z][a-z0-9+.-]*:/i.test(target)?'unsupported-scheme':target.startsWith('/')?'rooted':'relative';
  links.push({target,kind});
 }return links;
}
const inside=(root,path)=>path.startsWith(root+sep);
async function linkCounts(root,sourcePath,raw){
 const counts={relativeLinks:0,allowlistedTargetLinks:0,missingTargets:0,blockedTargets:0,externalLinks:0,fragmentLinks:0,unsupportedSchemeLinks:0};
 const allowed=new Set(FIRST_JOURNEY_PAGES.map(p=>resolve(root,p.path)));
 for(const link of extractMarkdownLinks(raw)){
  if(link.kind==='external'){counts.externalLinks++;continue;}if(link.kind==='fragment'){counts.fragmentLinks++;continue;}
  if(link.kind==='unsupported-scheme'){counts.unsupportedSchemeLinks++;continue;}if(link.kind==='rooted'){counts.blockedTargets++;continue;}
  counts.relativeLinks++;let target;
  try{target=resolve(dirname(sourcePath),decodeURIComponent(link.target.split(/[?#]/)[0]));}catch{counts.blockedTargets++;continue;}
  if(!inside(root,target)){counts.blockedTargets++;continue;}
  let physical;try{physical=await realpath(target);}catch{counts.missingTargets++;continue;}
  if(!inside(root,physical)){counts.blockedTargets++;continue;}if(allowed.has(physical))counts.allowlistedTargetLinks++;
 }return counts;
}
export const needsDeliveryReview=row=>row.fenceCutOffsetsUtf16.length>0||row.lineCutOffsetsUtf16.length>0||row.surrogateCutOffsetsUtf16.length>0||row.unclosedSourceFences>0||row.relativeLinks>0||row.blockedTargets>0||row.missingTargets>0||row.unsupportedSchemeLinks>0;
export async function auditFirstJourney({repositoryRoot=new URL('./',import.meta.url)}={}){
 if(!(repositoryRoot instanceof URL)||repositoryRoot.protocol!=='file:')throw new Error('Trusted local checkout required');
 const root=await realpath(fileURLToPath(repositoryRoot)),load=createFormalDraftLessonLoader({allowDraftContent:true,repositoryRoot}),rows=[];
 for(const p of FIRST_JOURNEY_PAGES){
  const path=await realpath(resolve(root,p.path));if(!inside(root,path))throw new Error('Source outside checkout');
  const bytes=await readFile(path);if(!bytes.length||bytes.length>131072)throw new Error('Source bounds');
  const raw=bytes.toString('utf8'),first=await load({courseKey:'ethical-hacking',cursor:`${p.key}:0`}),fragments=[];
  if(!Number.isSafeInteger(first.pageCount)||first.pageCount<1||first.pageCount>9999)throw new Error('Page bounds');
  for(let n=0;n<first.pageCount;n++){
   const page=await load({courseKey:'ethical-hacking',cursor:`${p.key}:${n}`}),prefix=`${p.title} — draft page ${n+1}/${first.pageCount}\n`,suffix=`\n\n${footer}`;
   if(page.pageKey!==p.key||page.pageIndex!==n||page.pageCount!==first.pageCount||typeof page.content!=='string'||page.content.length>1900||!page.content.startsWith(prefix)||!page.content.endsWith(suffix))throw new Error('Page envelope mismatch');
   fragments.push(page.content.slice(prefix.length,-suffix.length));
  }
  if(!Buffer.from(fragments.join(''),'utf8').equals(bytes))throw new Error('Source bytes changed');
  const row={document:p.key,path:p.path,bytes:bytes.length,pages:first.pageCount,sha256:createHash('sha256').update(bytes).digest('hex'),...inspectPagination(raw,fragments),...await linkCounts(root,path,raw)};
  rows.push({...row,deliveryReviewRequired:needsDeliveryReview(row)});
 }return rows;
}
const cell=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/`/g,'&#96;').replace(/\|/g,'&#124;').replace(/[\r\n]/g,' ');
export function renderAuditSummary(rows){
 return['## Draft lesson rendering audit — not release approval','',
 '| Document | Pages | Fence cuts | Line cuts | Unicode cuts | Relative links | Missing | Blocked | Unclosed fences | Delivery review |',
 '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
 ...rows.map(r=>`| ${cell(r.document)} | ${r.pages} | ${r.fenceCutOffsetsUtf16.length} | ${r.lineCutOffsetsUtf16.length} | ${r.surrogateCutOffsetsUtf16.length} | ${r.relativeLinks} | ${r.missingTargets} | ${r.blockedTargets+r.unsupportedSchemeLinks} | ${r.unclosedSourceFences} | ${r.deliveryReviewRequired?'Required':'Manual acceptance still required'} |`),'',
 'Findings are bounded heuristics, not a complete Markdown parser or educational/accessibility review. Relative-link existence is not working Discord navigation. External links and fragment targets are not fetched or validated. No lesson command, learner data, bot or database is executed. Passing CI does not authorize delivery.',''].join('\n');
}
export function auditAnnotation(row){
 if(!/^(?:start|EH-[A-Z0-9-]+)$/.test(row.document)||!/^docs\/formal-ethical-hacking\/(?:START-HERE\.md|lessons\/[A-Z0-9-]+\.md)$/.test(row.path))throw new Error('Bounded annotation metadata required');
 const data={document:row.document,bytes:row.bytes,pages:row.pages,sha256:row.sha256,fenceCuts:row.fenceCutOffsetsUtf16.length,lineCuts:row.lineCutOffsetsUtf16.length,surrogateCuts:row.surrogateCutOffsetsUtf16.length,firstFenceCutOffsetsUtf16:row.fenceCutOffsetsUtf16.slice(0,10),unclosedSourceFences:row.unclosedSourceFences,relativeLinks:row.relativeLinks,allowlistedTargetLinks:row.allowlistedTargetLinks,missingTargets:row.missingTargets,blockedTargets:row.blockedTargets,unsupportedSchemeLinks:row.unsupportedSchemeLinks,notice:'Review required before delivery; not release approval. Links/Markdown checks are heuristic.'};
 const message=JSON.stringify(data).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
 return`::${row.deliveryReviewRequired?'warning':'notice'} file=${row.path},line=1,title=Draft text audit (not release approval)::${message}`;
}
