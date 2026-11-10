import {discordId,operationId,exactFields} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal private authorization unavailable');};
const fields=['actorId','guildId','learnerId','studentId','courseKey','exerciseKey','workId','sourceChannelId'];
export function createFormalReviewPrivateCourseAuthorization(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,ready:false,initialize:async()=>({ready:false}),authorizeCourse:async()=>null,dispose(){},drain:async()=>{}});
 const {courseAuthorization:course,source,isReady}=options;
 if(course?.enabled!==true||!['initialize','authorizeCourse','dispose','drain'].every(k=>typeof course[k]==='function')||source?.enabled!==true||typeof source.verifyPrivateChannel!=='function'||typeof isReady!=='function'||course===source)fail();
 let stopped=false,up=false,initializing=null;const active=new Set();
 const ready=()=>{try{return !stopped&&up&&course.ready===true&&isReady()===true;}catch{return false;}};
 async function initialize(){
  if(stopped)fail();if(up&&course.ready===true)return Object.freeze({ready:true});if(initializing)return initializing;
  initializing=Promise.resolve().then(async()=>{try{if(stopped)fail();if((await course.initialize())?.ready!==true||course.ready!==true||stopped)fail();up=true;return Object.freeze({ready:true});}catch{up=false;fail();}finally{initializing=null;}});return initializing;
 }
 function authorizeCourse(scope){
  if(!ready()||active.size>=4)return Promise.resolve(null);
  const task=(async()=>{try{
   if(!exactFields(scope,fields)||![scope.actorId,scope.guildId,scope.learnerId,scope.sourceChannelId].every(discordId)||!operationId(scope.workId)||scope.courseKey!=='ethical-hacking-reading'||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100||typeof scope.exerciseKey!=='string'||!/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(scope.exerciseKey))fail();
   const selected=Object.freeze({...scope});
   if(await source.verifyPrivateChannel(selected)!==true||!ready())return null;
   const result=await course.authorizeCourse(selected);
   if(!ready()||result?.studentId!==selected.studentId||result?.courseKey!==selected.courseKey)return null;
   if(await source.verifyPrivateChannel(selected)!==true||!ready())return null;
   return Object.freeze({studentId:selected.studentId,courseKey:selected.courseKey});
  }catch{return null;}})();
  active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;
 }
 return Object.freeze({enabled:true,get ready(){return !stopped&&up&&course.ready===true;},initialize,authorizeCourse,dispose(){if(stopped)return;stopped=true;up=false;course.dispose();},async drain(){const results=await Promise.allSettled([...active,...(initializing?[initializing]:[])]);await course.drain();if(results.some(r=>r.status==='rejected'))fail();}});
}
