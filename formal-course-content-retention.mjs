import {discordId,exactFields,reviewClock} from './formal-review-policy.mjs';
export const COURSE_CONTENT_RETENTION_MS=86400000;
const key=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(x);
const reasons=new Set(['course-completed','admin-course-removed']);
const excluded=new Set(['learner-withdrawal-request','enrollment-revoked','discord-server-left','temporarily-suspended']);
const categories=new Set(['submission','feedback','saved-reading-position','certificate-verification']);
const fail=()=>{throw Error('Course retention evidence unavailable');};
export function inspectCourseContentRetention(input){
 try{
  if(!exactFields(input,['subjectId','courseKey','assignedAtMs','category','event','preservation','asOfMs'])||!discordId(input.subjectId)||!key(input.courseKey)||!categories.has(input.category)||!['clear','hold','unknown'].includes(input.preservation))fail();
  const assignedAtMs=reviewClock(input.assignedAtMs),asOfMs=reviewClock(input.asOfMs);if(assignedAtMs>asOfMs)fail();
  const result=(outcome,eligibleAtMs=null)=>Object.freeze({ok:true,outcome,subjectId:input.subjectId,courseKey:input.courseKey,assignedAtMs,category:input.category,eligibleAtMs,deletionAuthorized:false,changesAccess:false});
  if(input.category==='certificate-verification')return result('excluded-long-term-verification');
  if(input.event===null)return result('awaiting-course-end');
  const event=input.event;
  if(!exactFields(event,['reason','subjectId','courseKey','assignedAtMs','occurredAtMs','recordedBy','reference'])||event.subjectId!==input.subjectId||event.courseKey!==input.courseKey||event.assignedAtMs!==assignedAtMs||!discordId(event.recordedBy)||typeof event.reference!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(event.reference))fail();
  const occurredAtMs=reviewClock(event.occurredAtMs);if(occurredAtMs<assignedAtMs||occurredAtMs>asOfMs)fail();
  if(excluded.has(event.reason))return result('not-a-course-end-trigger');
  if(!reasons.has(event.reason))fail();
  const eligibleAtMs=occurredAtMs+COURSE_CONTENT_RETENTION_MS;
  if(input.preservation!=='clear')return result(input.preservation==='hold'?'preserved':'preservation-unresolved',eligibleAtMs);
  return result(asOfMs<eligibleAtMs?'within-retention-window':'eligible-for-reviewed-cleanup',eligibleAtMs);
 }catch{return Object.freeze({ok:false,outcome:'unavailable',deletionAuthorized:false,changesAccess:false});}
}
