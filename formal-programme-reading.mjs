import { open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
export const FORMAL_READING_PROGRAMME = Object.freeze({key:'ethical-hacking-reading',title:'Formal Ethical Hacking — draft reading'});
const footer='Draft reading only. No practical execution, saved progress, grade, programme completion or certificate is granted. Enrollment and an active reading assignment remain required.';
const pattern=/^EH-(?:LAB|LINUX|NET|WEB|TLS|ASSESS|EVIDENCE|MODEL|AUTO)-(?:[0-9]{2}|CAPSTONE|PRACTICAL-CAPSTONE)$/;
async function readSource(path, options={}) {
 const url=options.repositoryRoot??new URL('./',import.meta.url);
 if(!(url instanceof URL)||url.protocol!=='file:'||url.search||url.hash)throw Error('Trusted local source required');
 const root=await realpath(fileURLToPath(url)),location=resolve(root,path),canonical=await realpath(location);
 if(canonical!==location)throw Error('Symbolic source paths unavailable');
 const file=await open(location,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
 try{const stat=await file.stat();if(!stat.isFile()||stat.size<1||stat.size>131072)throw Error('Source bounds');
 const bytes=Buffer.alloc(131073);let used=0;while(used<bytes.length){const r=await file.read(bytes,used,bytes.length-used,used);if(!r.bytesRead)break;used+=r.bytesRead;}
 if(!used||used>131072)throw Error('Source bounds');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes.subarray(0,used));if(!text.trim())throw Error('Empty source');return text;
 }finally{await file.close();}
}
export async function loadFormalReadingCatalogue(options={}) {
 const value=JSON.parse(await readSource('docs/formal-ethical-hacking/curriculum-catalogue.json',options));
 if(value?.schemaVersion!==1||value.status!=='draft-not-published'||value.runtimeIntegration!==false||value.publishable!==false||value.labDelivery!=='student-built'||!Array.isArray(value.lessons)||!value.lessons.length||value.lessons.length>100)throw Error('Reviewed draft catalogue required');
 const graph=new Map();for(const item of value.lessons){if(typeof item?.id!=='string'||!pattern.test(item.id)||graph.has(item.id)||!Array.isArray(item.requires)||item.requires.length>20||new Set(item.requires).size!==item.requires.length)throw Error('Invalid lesson metadata');graph.set(item.id,item.requires);}
 const active=new Set(),done=new Set();function visit(id){if(active.has(id)||!graph.has(id))throw Error('Invalid prerequisite graph');if(done.has(id))return;active.add(id);for(const next of graph.get(id))visit(next);active.delete(id);done.add(id);}for(const id of graph.keys())visit(id);
 return Object.freeze(value.lessons.map(item=>Object.freeze({id:item.id,requires:Object.freeze([...item.requires])})));
}
export async function loadFormalReadingLesson(index,options={}) {
 const catalogue=await loadFormalReadingCatalogue(options);if(!Number.isSafeInteger(index)||index<0||index>=catalogue.length)throw Error('Invalid lesson');
 const item=catalogue[index],text=await readSource(`docs/formal-ethical-hacking/lessons/${item.id}.md`,options),chunks=[];let start=0;
 while(start<text.length){let end=Math.min(start+2400,text.length);if(end<text.length){const cut=text.lastIndexOf('\n',end);if(cut>start+400)end=cut;if(/[\uDC00-\uDFFF]/.test(text[end]))end--;}chunks.push(text.slice(start,end));start=end;}
 return Object.freeze({...item,title:(/^#\s+(.+)$/m.exec(text)?.[1]||item.id).slice(0,180).replace(/[\uD800-\uDBFF]$/,''),chunks:Object.freeze(chunks)});
}
export async function renderFormalReadingPage({courseKey,cursor,buttonId}={},options={}) {
 const match=/^(overview|module|lesson):([0-9]{1,4}):([0-9]{1,4})$/.exec(cursor??'');
 if(courseKey!==FORMAL_READING_PROGRAMME.key||!match||typeof buttonId!=='function')throw Error('Invalid reading request');
 const [,view,indexText,pageText]=match,index=Number(indexText),page=Number(pageText),catalogue=await loadFormalReadingCatalogue(options),components=[];
 const button=(next,label)=>{const id=buttonId(next);if(typeof id!=='string'||!id.length||id.length>100)throw Error('Invalid reading control');return {type:2,style:2,custom_id:id,label};};
 const row=items=>({type:1,components:items}),embed={title:FORMAL_READING_PROGRAMME.title,color:0x3498db,description:'',footer:{text:footer}};
 if(view==='overview'){
  if(index!==0||page>=Math.ceil(catalogue.length/5))throw Error('Invalid contents page');
  const visible=catalogue.slice(page*5,page*5+5);embed.description=`Draft reading contents — page ${page+1}/${Math.ceil(catalogue.length/5)}.\nPractical exercises are not activated. Listed prerequisites are reading guidance, not verified achievement.\n${visible.map(item=>item.id+' — requires: '+(item.requires.join(', ')||'none')).join('\n')}`;
  components.push(row(visible.map((item,n)=>button(`module:${page*5+n}:0`,item.id))));
  const controls=[];if(page)controls.push(button(`overview:0:${page-1}`,'Previous lessons'));controls.push(button(`overview:0:${page}`,'Refresh contents'));if((page+1)*5<catalogue.length)controls.push(button(`overview:0:${page+1}`,'Next lessons'));components.push(row(controls));
 }else{
  const lesson=await loadFormalReadingLesson(index,options);embed.title=lesson.title;
  if(view==='module'){if(page!==0)throw Error('Invalid lesson overview');embed.description=`${lesson.id}\nDraft reading only; practical exercises are not activated.\nListed prerequisites: ${lesson.requires.join(', ')||'none'}. Reading does not verify that prerequisites have been achieved.`;components.push(row([button(`lesson:${index}:0`,'Read lesson')]));}
  else{if(page>=lesson.chunks.length)throw Error('Invalid text page');embed.description=`Reading only — practical exercises are not activated.\n${lesson.id} — page ${page+1}/${lesson.chunks.length}\n\n${lesson.chunks[page]}`;}
  const controls=[button(`overview:0:${Math.floor(index/5)}`,'Programme contents')];
  if(view==='lesson'){controls.push(button(`module:${index}:0`,'Lesson overview'));if(page)controls.push(button(`lesson:${index}:${page-1}`,'Previous text'));if(page+1<lesson.chunks.length)controls.push(button(`lesson:${index}:${page+1}`,'Next text'));}
  else{if(index)controls.push(button(`module:${index-1}:0`,'Previous lesson'));if(index+1<catalogue.length)controls.push(button(`module:${index+1}:0`,'Next lesson'));}components.push(row(controls));
 }
 return {content:'',embeds:[embed],components,allowedMentions:{parse:[]}};
}
