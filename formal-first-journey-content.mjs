import {readFile,realpath} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const FIRST_JOURNEY_PAGES=Object.freeze([
 Object.freeze({key:'start',title:'Start here',path:'docs/formal-ethical-hacking/START-HERE.md'}),
 ...['EH-LAB-00','EH-LAB-01','EH-LAB-02','EH-LINUX-01','EH-LINUX-02','EH-LINUX-03','EH-LAB-03','EH-LAB-04','EH-LAB-05'].map(key=>Object.freeze({key,title:key,path:`docs/formal-ethical-hacking/lessons/${key}.md`}))
]);
const referencePairs=Object.freeze([
 ...['EH-LAB-00','EH-LAB-01','EH-LAB-02','EH-LINUX-01','EH-LINUX-02','EH-LINUX-03','EH-LAB-03','EH-LAB-04','EH-LAB-05'].map(pageKey=>Object.freeze({sourceKey:'start',target:`lessons/${pageKey}.md`,pageKey})),
 ...['FIRST-PRACTICAL-WORKSHEET.md','README.md','authoring/FIRST-JOURNEY-PILOT.md','PROGRAMME-BLUEPRINT.md'].map(target=>Object.freeze({sourceKey:'start',target,pageKey:null})),
 Object.freeze({sourceKey:'EH-LINUX-02',target:'LINUX-PRIVILEGE-BOUNDARIES.md',pageKey:null})
]);
export const reviewedDraftReferences=()=>referencePairs;
export function resolveDraftReference(sourceKey,target){
 const denied=()=>Object.freeze({available:false});
 if(typeof sourceKey!=='string'||typeof target!=='string'||target.length>200)return denied();
 const ref=referencePairs.find(r=>r.sourceKey===sourceKey&&r.target===target),page=ref?.pageKey&&FIRST_JOURNEY_PAGES.find(p=>p.key===ref.pageKey);
 if(!page)return denied();
 return Object.freeze({available:true,cursor:`${page.key}:0`,label:`Read ${page.key}`});
}
export function relatedReadingFor(sourceKey){
 const refs=referencePairs.filter(r=>r.sourceKey===sourceKey),resolved=refs.map(r=>resolveDraftReference(sourceKey,r.target));
 return Object.freeze({available:Object.freeze(resolved.filter(r=>r.available)),unavailableCount:resolved.filter(r=>!r.available).length});
}
const footer='Draft review only. Reading does not grant enrollment, exercise authorization, completion or an award. Report intake and reviewer actions are unavailable.';
export function createFormalDraftLessonLoader({allowDraftContent=false,repositoryRoot=new URL('./',import.meta.url)}={}){
 if(allowDraftContent!==true)return async()=>{throw new Error('Draft content not approved');};
 if(!(repositoryRoot instanceof URL)||repositoryRoot.protocol!=='file:')throw new Error('Trusted local checkout required');
 return async({courseKey,cursor})=>{
  if(courseKey!=='ethical-hacking')throw new Error('Unavailable');
  if(cursor==='overview')return{content:['Formal ethical hacking — first-practical draft',...FIRST_JOURNEY_PAGES.map(p=>p.title),footer].join('\n')};
  if(cursor==='help')return{content:`Use the course entry button to re-enter after expiry or restart. Do not submit reports, attachments, credentials or personal evidence through this draft viewer. ${footer}`};
  if(cursor==='status')return{content:`Navigation-only candidate. No saved progress, submission, review, grade or award is implemented. ${footer}`};
  const m=/^([A-Za-z0-9-]+):([0-9]{1,4})$/.exec(cursor),page=m&&FIRST_JOURNEY_PAGES.find(p=>p.key===m[1]);
  if(!page)throw new Error('Unavailable');
  const root=await realpath(fileURLToPath(repositoryRoot));
  const location=await realpath(resolve(root,page.path));
  if(!location.startsWith(root+sep))throw new Error('Unavailable');
  const raw=await readFile(location,'utf8');
  if(!raw||Buffer.byteLength(raw,'utf8')>131072)throw new Error('Unavailable');
  // Exact contiguous draft text, no Markdown evaluation or command execution.
  const chunks=[];let remaining=raw;
  while(remaining.length>1400){let end=remaining.lastIndexOf('\n',1400);if(end<400)end=1400;
   if(end>0&&/^[\uDC00-\uDFFF]$/.test(remaining[end]))end--;
   chunks.push(remaining.slice(0,end));remaining=remaining.slice(end);}
  chunks.push(remaining);const index=Number(m[2]);if(index>=chunks.length)throw new Error('Unavailable');
  return{content:`${page.title} — draft page ${index+1}/${chunks.length}\n${chunks[index]}\n\n${footer}`,pageKey:page.key,pageIndex:index,pageCount:chunks.length};
 };
}
