import {createHash} from 'node:crypto';
const instances=new WeakSet();
const goodText=(x,n)=>typeof x==='string'&&x.trim().length>0&&x.length<=n&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\uD800-\uDFFF]/u.test(x);
function fields(x,keys){
 if(!x||typeof x!=='object'||Array.isArray(x)||![Object.prototype,null].includes(Object.getPrototypeOf(x)))throw new Error('Plain package data required');
 const names=Reflect.ownKeys(x);if(names.length!==keys.length||keys.some(k=>!names.includes(k)))throw new Error('Unexpected package fields');
 const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(x,k);if(!d||!Object.hasOwn(d,'value'))throw new Error('Package accessor refused');out[k]=d.value;}return out;
}
export const isStudentCourseSet=x=>instances.has(x);
export function createStudentCourseSet(input){
 if(!Array.isArray(input)||input.length<1||input.length>2)throw new Error('One or two reviewed student packages required');
 const courses=new Map();let bytes=0,count=0;
 for(const raw of input){
  const p=fields(raw,['courseKey','title','audience','reviewRef','lessons']);
  if(!['ethical-hacking','incident-response'].includes(p.courseKey)||courses.has(p.courseKey)||p.audience!=='student'||!goodText(p.title,100)||!goodText(p.reviewRef,200)||!Array.isArray(p.lessons)||!p.lessons.length||p.lessons.length>200)throw new Error('Invalid student package');
  const seen=new Set(),lessons=[];
  for(const rawLesson of p.lessons){
   const l=fields(rawLesson,['key','title','pages']);
   if(typeof l.key!=='string'||!/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(l.key)||/INSTRUCTOR|RUBRIC|ANSWER-KEY|VALIDATION/i.test(l.key)||seen.has(l.key)||!goodText(l.title,100)||!Array.isArray(l.pages)||!l.pages.length||l.pages.length>10000)throw new Error('Invalid student lesson');
   seen.add(l.key);const pages=[];
   for(const page of l.pages){if(!goodText(page,1200)||++count>10000)throw new Error('Invalid student page');bytes+=Buffer.byteLength(page,'utf8');if(bytes>4194304)throw new Error('Student package aggregate bound');pages.push(page);}
   lessons.push(Object.freeze({key:l.key,title:l.title,pages:Object.freeze(pages)}));
  }
  const revision=createHash('sha256').update(JSON.stringify({courseKey:p.courseKey,title:p.title,audience:'student',reviewRef:p.reviewRef,lessons})).digest('hex');
  const summary=Object.freeze({courseKey:p.courseKey,title:p.title,revision,lessons:Object.freeze(lessons.map(l=>Object.freeze({key:l.key,title:l.title,pageCount:l.pages.length})))});
  courses.set(p.courseKey,{summary,lessons});
 }
 const api=Object.freeze({
  describe:key=>courses.get(key)?.summary??null,
  page(key,lessonKey,index){const c=courses.get(key),l=c?.lessons.find(x=>x.key===lessonKey);if(!l||!Number.isSafeInteger(index)||index<0||index>=l.pages.length)throw new Error('Unavailable student page');return Object.freeze({revision:c.summary.revision,lessonKey:l.key,pageIndex:index,title:l.title,content:l.pages[index]});},
  bookmarkMetadata:()=>Object.freeze([...courses.values()].map(c=>Object.freeze({courseKey:c.summary.courseKey,revision:c.summary.revision,pages:Object.freeze(Object.fromEntries(c.summary.lessons.map(l=>[l.key,l.pageCount])))})))
 });instances.add(api);return api;
}
