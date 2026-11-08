import {open,realpath} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TextDecoder} from 'node:util';
export const FORMAL_ADMIN_PREVIEW_INDEX=99998;
export const FORMAL_ADMIN_PREVIEW_TITLE='Formal Ethical Hacking — draft preview';
const MAX_BYTES=131072,PAGE_CHARS=2400;
const unavailable=()=>new Error('Formal draft preview unavailable');
export function canInspectFormalAdminPreview(i,config,guildId){
 try {
  const valid=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
  const m=i?.message,origin=m?.interactionMetadata?.user?.id||m?.interaction?.user?.id;
  return config?.enabled===true&&valid(config.ownerId)&&valid(config.adminChannelId)&&valid(guildId)&&
   i?.user?.id===config.ownerId&&i.user.bot===false&&i.guildId===guildId&&i.guild?.id===guildId&&
   i.channelId===config.adminChannelId&&i.isButton?.()===true&&m?.flags?.has?.(64)===true&&origin===i.user.id&&
   valid(i.client?.user?.id)&&m.author?.id===i.client.user.id;
 }catch{return false;}
}
function catalogue(raw){
 let value;try{value=JSON.parse(raw);}catch{throw unavailable();}
 if(!value||value.schemaVersion!==1||value.status!=='draft-not-published'||value.runtimeIntegration!==false||value.publishable!==false||value.labDelivery!=='student-built'||!Array.isArray(value.lessons)||value.lessons.length<1||value.lessons.length>100)throw unavailable();
 const pattern=/^EH-(?:LAB|LINUX|NET|WEB|TLS|ASSESS|EVIDENCE|MODEL|AUTO)-(?:[0-9]{2}|CAPSTONE|PRACTICAL-CAPSTONE)$/;
 const seen=new Set();
 for(const item of value.lessons){if(!item||typeof item.id!=='string'||!pattern.test(item.id)||seen.has(item.id)||!Array.isArray(item.requires)||item.requires.length>20||new Set(item.requires).size!==item.requires.length)throw unavailable();seen.add(item.id);}
 for(const item of value.lessons)if(item.requires.some(id=>typeof id!=='string'||!seen.has(id)||id===item.id))throw unavailable();
 const map=new Map(value.lessons.map(item=>[item.id,item.requires])),active=new Set(),done=new Set();
 const visit=id=>{if(active.has(id))throw unavailable();if(done.has(id))return;active.add(id);for(const prerequisite of map.get(id))visit(prerequisite);active.delete(id);done.add(id);};
 for(const id of seen)visit(id);
 return Object.freeze({title:FORMAL_ADMIN_PREVIEW_TITLE,status:'draft-not-published',labDelivery:'student-built',lessons:Object.freeze(value.lessons.map(item=>Object.freeze({id:item.id,requires:Object.freeze([...item.requires])})))});
}
function pages(text){
 const result=[];let start=0;
 while(start<text.length){let end=Math.min(start+PAGE_CHARS,text.length);if(end<text.length){const newline=text.lastIndexOf('\n',end);if(newline>start+400)end=newline;if(/[\uDC00-\uDFFF]/.test(text[end]))end--;}
  result.push(text.slice(start,end));start=end;}
 return result;
}
export async function loadFormalAdminPreview({interaction,config,guildId,repositoryRoot=new URL('./',import.meta.url),lessonIndex=null,page=0}={}){
 const authorize=()=>{if(!canInspectFormalAdminPreview(interaction,config,guildId))throw unavailable();};
 authorize();
 if(!Number.isSafeInteger(page)||page<0||page>99999||(lessonIndex!==null&&(!Number.isSafeInteger(lessonIndex)||lessonIndex<0||lessonIndex>99)))throw unavailable();
 if(!(repositoryRoot instanceof URL)||repositoryRoot.protocol!=='file:'||repositoryRoot.search||repositoryRoot.hash||!repositoryRoot.pathname.endsWith('/'))throw unavailable();
 try {
  const root=await realpath(fileURLToPath(repositoryRoot));authorize();
  const read=async path=>{
   authorize();const canonical=await realpath(resolve(root,path));const rel=relative(root,canonical);
   if(!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw unavailable();authorize();
   const file=await open(canonical,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
   try{const info=await file.stat();if(!info.isFile()||info.size<1||info.size>MAX_BYTES)throw unavailable();
    const buffer=Buffer.alloc(MAX_BYTES+1);let used=0;
    while(used<buffer.length){const {bytesRead}=await file.read(buffer,used,buffer.length-used,used);if(!bytesRead)break;used+=bytesRead;}
    if(used<1||used>MAX_BYTES)throw unavailable();authorize();
    const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buffer.subarray(0,used));if(!text.trim())throw unavailable();return text;
   }finally{await file.close();}
  };
  const data=catalogue(await read('docs/formal-ethical-hacking/curriculum-catalogue.json'));authorize();
  if(lessonIndex===null){if(page>=Math.ceil(data.lessons.length/5))throw unavailable();return data;}
  const lesson=data.lessons[lessonIndex];if(!lesson)throw unavailable();
  const text=await read(`docs/formal-ethical-hacking/lessons/${lesson.id}.md`),chunks=pages(text);if(page>=chunks.length)throw unavailable();authorize();
  const heading=/^#\s+(.+)$/m.exec(text)?.[1]||lesson.id;
  return Object.freeze({title:FORMAL_ADMIN_PREVIEW_TITLE,status:data.status,id:lesson.id,requires:lesson.requires,lessonIndex,lessonCount:data.lessons.length,
   heading:heading.slice(0,140).replace(/[\uD800-\uDBFF]$/,''),prerequisiteIndexes:Object.freeze(lesson.requires.map(id=>data.lessons.findIndex(item=>item.id===id))),page,pageCount:chunks.length,text:chunks[page]});
 }catch{throw unavailable();}
}
