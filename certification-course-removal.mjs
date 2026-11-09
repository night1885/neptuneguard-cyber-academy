import {randomUUID} from 'node:crypto';
import {createCertificationCourseLifecycle} from './certification-course-lifecycle.js';
import {inspectCourseContentRetention} from './formal-course-content-retention.mjs';
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const unavailable=()=>{throw Error('Course removal unavailable');};
export function createCertificationCourseRemoval(pool,config={},options={}){
 if(config.enabled!==true||config.courseRemovalEnabled!==true)return Object.freeze({enabled:false,removeCourse:async()=>({ok:false}),assignCourses:async()=>({ok:false}),completeCourse:async()=>({ok:false}),getCourseAuthorization:async()=>null,dispose(){},drain:async()=>{}});
 const {courseKeys,now=()=>new Date(),schema='public',isReady}=options;
 if(!id(config.ownerId)||!Array.isArray(courseKeys)||!courseKeys.length||new Set(courseKeys).size!==courseKeys.length||!courseKeys.every(k=>typeof k==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(k))||!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)||typeof now!=='function'||typeof isReady!=='function'||typeof pool?.query!=='function'||typeof pool?.connect!=='function')unavailable();
 const settings=Object.freeze({...config}),allowed=new Set(courseKeys),prefix='"'+schema+'".';
 const base=createCertificationCourseLifecycle(pool,settings,{courseKeys:[...courseKeys],now});
 let stopped=false;const active=new Set();
 function ready(){if(stopped||isReady()!==true)unavailable();}
 function instant(){const value=now();if(!(value instanceof Date)||!Number.isFinite(value.getTime())||value.getUTCFullYear()<1970||value.getUTCFullYear()>9998)unavailable();return value;}
 function validate(actor,subject,key){ready();if(actor!==settings.ownerId||!id(subject)||!allowed.has(key))unavailable();}
 function run(fn){if(stopped||active.size>=8)return Promise.reject(Error('Course removal unavailable'));const task=Promise.resolve().then(async()=>{ready();const result=await fn();ready();return result;});active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;}
 async function removed(subject,key){ready();const r=await pool.query(`SELECT 1 AS removed FROM ${prefix}certification_course_removals WHERE discord_user_id=$1 AND course_key=$2 LIMIT 1`,[subject,key]);ready();if(!Array.isArray(r?.rows))unavailable();return r.rows.length!==0;}
 function receipt(subject,key,course,event,alreadyRemoved){
  const assignedAt=new Date(course.assigned_at),removedAt=new Date(event.removed_at);
  if(new Date(event.assigned_at).getTime()!==assignedAt.getTime())unavailable();
  const policy=inspectCourseContentRetention({subjectId:subject,courseKey:key,assignedAtMs:assignedAt.getTime(),category:'submission',event:{reason:'admin-course-removed',subjectId:subject,courseKey:key,assignedAtMs:assignedAt.getTime(),occurredAtMs:removedAt.getTime(),recordedBy:event.removed_by,reference:event.reference},preservation:'unknown',asOfMs:instant().getTime()});
  if(policy.ok!==true||policy.eligibleAtMs===null)unavailable();
  return Object.freeze({ok:true,alreadyRemoved,courseKey:key,reference:event.reference,assignedAt:assignedAt.toISOString(),removedAt:removedAt.toISOString(),eligibleAt:new Date(policy.eligibleAtMs).toISOString(),accessBlockedByThisService:true,deletionAuthorized:false});
 }
 const removeCourse=(actor,subject,key)=>run(async()=>{
  validate(actor,subject,key);const db=await pool.connect();let discard=false;
  const query=async(sql,args)=>{ready();const result=await db.query(sql,args);ready();return result;};
  try{
   await query('BEGIN');await query("SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'; SET LOCAL idle_in_transaction_session_timeout='10s'");
   const enrollment=(await query(`SELECT * FROM ${prefix}certification_enrollments WHERE discord_user_id=$1 FOR UPDATE`,[subject])).rows[0];
   if(!enrollment||!['approved','suspended','revoked'].includes(enrollment.status)||typeof enrollment.student_id!=='string'||!enrollment.student_id.trim()||!id(enrollment.approved_by)||!enrollment.approved_at||!['application_closed_at','application_closed_by','application_closed_as'].every(k=>Object.hasOwn(enrollment,k)&&enrollment[k]===null))unavailable();
   const course=(await query(`SELECT * FROM ${prefix}certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2 FOR UPDATE`,[subject,key])).rows[0];if(!course)unavailable();
   const old=(await query(`SELECT * FROM ${prefix}certification_course_removals WHERE discord_user_id=$1 AND course_key=$2`,[subject,key])).rows;
   if(old.length>1)unavailable();if(old.length===1){const result=receipt(subject,key,course,old[0],true);await query('COMMIT');return result;}
   if(course.status!=='active')unavailable();const time=instant().toISOString(),reference=randomUUID();
   const result=await query(`INSERT INTO ${prefix}certification_course_removals(discord_user_id,course_key,assigned_at,removed_at,removed_by,reference) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[subject,key,course.assigned_at,time,actor,reference]);
   if(result.rowCount!==1||result.rows.length!==1)unavailable();const projected=receipt(subject,key,course,result.rows[0],false);
   await query(`INSERT INTO ${prefix}certification_audit_events(actor_discord_user_id,subject_discord_user_id,action,details,created_at) VALUES($1,$2,'course_removed',$3::jsonb,$4)`,[actor,subject,JSON.stringify({courseKey:key,reference}),time]);
   await query('COMMIT');return projected;
  }catch{try{await db.query('ROLLBACK');}catch{discard=true;}throw Error('Course removal outcome unconfirmed; inspect the same course before retrying');}finally{db.release(discard);}
 });
 const assignCourses=(actor,subject,keys)=>run(async()=>{if(!Array.isArray(keys)||!keys.length||new Set(keys).size!==keys.length)unavailable();for(const key of keys){validate(actor,subject,key);if(await removed(subject,key))unavailable();}const result=await base.assignCourses(actor,subject,keys);for(const key of keys)if(await removed(subject,key))throw Error('Assignment outcome requires reconciliation');return result;});
 const completeCourse=(actor,subject,key)=>run(async()=>{validate(actor,subject,key);if(await removed(subject,key))unavailable();return base.completeCourse(actor,subject,key);});
 const getCourseAuthorization=(subject,key)=>run(async()=>{if(!id(subject)||!allowed.has(key)||await removed(subject,key))return null;const grant=await base.getCourseAuthorization(subject,key);if(!grant||await removed(subject,key))return null;return grant;}).catch(()=>null);
 return Object.freeze({enabled:true,removeCourse,assignCourses,completeCourse,getCourseAuthorization,dispose(){stopped=true;},async drain(){await Promise.allSettled([...active]);}});
}
