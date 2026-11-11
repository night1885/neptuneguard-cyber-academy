import { open, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
export const FORMAL_READING_PROGRAMME = Object.freeze({key:'ethical-hacking-reading',title:'Ethical Hacking'});
const footer='Read-only learning. Teaching material remains draft. No practical execution, saved progress, grade, programme completion or certificate is granted. Enrollment and an active reading assignment remain required.';
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
const subjects={LAB:'Lab preparation and isolation',LINUX:'Linux foundations',NET:'Networking and service analysis',WEB:'Web and application security',TLS:'TLS and certificate verification',ASSESS:'Assessment methodology',EVIDENCE:'Evidence and reporting',MODEL:'Threat modelling',AUTO:'Security automation'};
function modulesFor(catalogue){
 const groups=[],seen=new Map();
 catalogue.forEach((item,index)=>{const subject=item.id.split('-')[1];let group=groups.at(-1);
  if(!group||group.subject!==subject){const sequence=(seen.get(subject)||0)+1;seen.set(subject,sequence);group={subject,title:subjects[subject]+(sequence>1?` — part ${sequence}`:''),indices:[]};groups.push(group);}group.indices.push(index);
 });
 return Object.freeze(groups.map(group=>Object.freeze({...group,indices:Object.freeze(group.indices)})));
}
export async function loadFormalReadingModules(options={}){return modulesFor(await loadFormalReadingCatalogue(options));}
const displayTitle=lesson=>lesson.title.replace(/^EH-[A-Z]+-(?:PRACTICAL-CAPSTONE|CAPSTONE|[0-9]{2})\s*[—–:-]\s*/,'').trim()||'Lesson';
const boundedLabel=value=>value.slice(0,80).replace(/[\uD800-\uDBFF]$/,'');
export async function renderFormalReadingPage({courseKey,cursor,buttonId}={},options={}) {
 const match=/^(overview|module|lesson):([0-9]{1,4}):([0-9]{1,4})$/.exec(cursor??'');
 if(courseKey!==FORMAL_READING_PROGRAMME.key||!match||typeof buttonId!=='function')throw Error('Invalid reading request');
 const [,view,indexText,pageText]=match,index=Number(indexText),page=Number(pageText),catalogue=await loadFormalReadingCatalogue(options),modules=modulesFor(catalogue),components=[];
 const button=(next,label)=>{const id=buttonId(next);if(typeof id!=='string'||!id.length||id.length>100)throw Error('Invalid reading control');return {type:2,style:2,custom_id:id,label:boundedLabel(label)};};
 const row=items=>({type:1,components:items}),embed={title:FORMAL_READING_PROGRAMME.title,color:0x3498db,description:'',footer:{text:footer}};
 if(view==='overview'&&index===0&&page===0){
  embed.description=[`One course • ${modules.length} modules • ${catalogue.length} lessons`,
   'Study ethical hacking from authorization and lab preparation through Linux, networking, application security, TLS, assessment, evidence, threat modelling and automation.',
   'Work through the modules in order, or browse a named module below. Each lesson opens its complete existing teaching text, including its explanations, examples, exercises and source references where authored.',
   'Study method: read the explanation, predict the example result, work only within the lesson’s stated scope, then explain the evidence and limitations. Reading does not establish practical permission or verified achievement.',
   'Course modules:',...modules.map((group,n)=>`${n+1}. ${group.title} (${group.indices.length} lessons)`) ].join('\n\n');
  components.push(row([button('module:0:0','Start course'),button('overview:0:1','All lessons')]));
  const choices=modules.map((group,n)=>button(`overview:${n+1}:0`,`${n+1}. ${group.title}`));
  for(let start=0;start<choices.length;start+=5)components.push(row(choices.slice(start,start+5)));
  if(components.length>5)throw Error('Course home exceeds reviewed module bounds');
 }else if(view==='overview'){
  const group=index===0?null:modules[index-1];if(index!==0&&!group)throw Error('Invalid module');
  const indices=group?group.indices:catalogue.map((_,n)=>n),listPage=index===0?page-1:page;
  if(listPage<0||listPage>=Math.ceil(indices.length/5))throw Error('Invalid contents page');
  const visible=indices.slice(listPage*5,listPage*5+5),lessons=await Promise.all(visible.map(n=>loadFormalReadingLesson(n,options)));
  embed.title=`Ethical Hacking — ${group?group.title:'All lessons'}`;
  embed.description=[`Lessons — page ${listPage+1}/${Math.ceil(indices.length/5)}.`,
   'These lessons are inside the Ethical Hacking course. Select a lesson to open its teaching text. Practical exercises are not activated.',
   ...lessons.map((lesson,n)=>`${visible[n]+1}. ${displayTitle(lesson)}`)].join('\n\n');
  components.push(row(lessons.map((lesson,n)=>button(`lesson:${visible[n]}:0`,`${visible[n]+1}. ${displayTitle(lesson)}`))));
  const controls=[button('overview:0:0','Course home')];
  if(listPage>0)controls.push(button(`overview:${index}:${page-1}`,'Previous lessons'));
  if(listPage+1<Math.ceil(indices.length/5))controls.push(button(`overview:${index}:${page+1}`,'Next lessons'));components.push(row(controls));
 }else{
  const lesson=await loadFormalReadingLesson(index,options);embed.title=`Ethical Hacking — ${displayTitle(lesson)}`.slice(0,256).replace(/[\uD800-\uDBFF]$/,'');
  if(view==='module'){if(page!==0)throw Error('Invalid lesson overview');
   const required=await Promise.all(lesson.requires.map(id=>loadFormalReadingLesson(catalogue.findIndex(item=>item.id===id),options)));
   embed.description=[`Lesson ${index+1} of ${catalogue.length}: ${displayTitle(lesson)}`,
    'Read the complete lesson for its learning outcomes, explanations, worked examples and practice instructions where included.',
    `Suggested prior reading: ${required.map(displayTitle).join('; ')||'Start here — no prior course lesson required'}.`,
    'Teaching material remains draft. Reading does not verify prerequisites or authorize practical exercises.'].join('\n\n');
   components.push(row([button(`lesson:${index}:0`,'Read lesson')]));
  }else{if(page>=lesson.chunks.length)throw Error('Invalid text page');embed.description=`Reading only — practical exercises are not activated.\nLesson ${index+1} of ${catalogue.length} — page ${page+1}/${lesson.chunks.length}\n\n${lesson.chunks[page]}`;}
  const controls=[button('overview:0:0','Course home')];
  if(view==='lesson'){controls.push(button(`module:${index}:0`,'Lesson overview'));if(page)controls.push(button(`lesson:${index}:${page-1}`,'Previous text'));if(page+1<lesson.chunks.length)controls.push(button(`lesson:${index}:${page+1}`,'Next text'));}
  else{if(index)controls.push(button(`module:${index-1}:0`,'Previous lesson'));if(index+1<catalogue.length)controls.push(button(`module:${index+1}:0`,'Next lesson'));}components.push(row(controls));
 }
 return {content:'',embeds:[embed],components,allowedMentions:{parse:[]}};
}
