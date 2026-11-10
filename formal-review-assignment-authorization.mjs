import {discordId,operationId,exactFields} from './formal-review-policy.mjs';
const fields=['actorId','guildId','learnerId','studentId','courseKey','exerciseKey','workId','sourceChannelId'];
const fail=()=>{throw Error('Assignment-bound course authorization unavailable');};
const ident=x=>typeof x==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(x);
const tables=[['formal_review.assignment_bindings',['work_id','learner_id','course_key','assigned_at']],['formal_review.work',['id','guild_id','learner_id','student_id','course_key','exercise_key','channel_id','created_ms','expires_ms']],['public.certification_course_enrollments',['discord_user_id','course_key','assigned_at','status']]];
export function createAssignmentBoundReviewAuthorization(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,ready:false,initialize:async()=>({ready:false}),authorizeCourse:async()=>null,dispose(){},drain:async()=>{}});
 const {courseAuthorization:base,readPool,expectedDatabase,expectedLogin,guildId,isReady,providerTimeoutMs=2000}=options;
 if(base?.enabled!==true||!['initialize','authorizeCourse','dispose','drain'].every(k=>typeof base[k]==='function')||typeof readPool?.query!=='function'||![expectedDatabase,expectedLogin].every(ident)||!discordId(guildId)||typeof isReady!=='function'||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<20||providerTimeoutMs>5000)fail();
 let stopped=false,ready=false,initializing=null;const pending=new Set();
 function alive(required=true){if(stopped||(required&&(!ready||base.ready!==true||isReady()!==true)))fail();}
 function bounded(fn){if(pending.size>=8)fail();const task=Promise.resolve().then(fn);pending.add(task);void task.then(()=>pending.delete(task),()=>pending.delete(task));let timer;return Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Assignment-bound course authorization unavailable')),providerTimeoutMs);})]).finally(()=>clearTimeout(timer));}
 async function initialize(){
  alive(false);if(ready)return Object.freeze({ready:true});if(initializing)return initializing;
  initializing=(async()=>{try{
   const p=(await bounded(()=>readPool.query(`SELECT current_database() AS database,current_user AS login,current_user=session_user AS direct,
    NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted,
    NOT has_schema_privilege(current_user,'public','CREATE') AND NOT has_schema_privilege(current_user,'formal_review','CREATE') AS no_create,
    current_setting('default_transaction_read_only')='on' AS readonly,
    current_setting('statement_timeout')<>'0' AS bounded,
    NOT has_column_privilege(current_user,'formal_review.reports','body','SELECT') AND NOT has_column_privilege(current_user,'formal_review.reviews','feedback','SELECT') AS no_body`))).rows[0];alive(false);
   if(p?.database!==expectedDatabase||p.login!==expectedLogin||['direct','restricted','no_create','readonly','bounded','no_body'].some(k=>p[k]!==true))fail();
   for(const [table,columns] of tables){
    const r=(await bounded(()=>readPool.query(`SELECT
     NOT EXISTS(SELECT 1 FROM unnest($2::text[]) AS c(name) WHERE NOT has_column_privilege(current_user,$1,c.name,'SELECT')) AS reads,
     NOT has_table_privilege(current_user,$1,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') AND NOT has_any_column_privilege(current_user,$1,'INSERT,UPDATE') AS no_writes,
     NOT pg_has_role(current_user,(SELECT relowner FROM pg_catalog.pg_class WHERE oid=$1::regclass),'MEMBER') AS not_owner`,[table,columns]))).rows[0];alive(false);
    if(!r||['reads','no_writes','not_owner'].some(k=>r[k]!==true))fail();
   }
   if((await bounded(()=>base.initialize()))?.ready!==true||base.ready!==true)fail();alive(false);ready=true;return Object.freeze({ready:true});
  }catch{ready=false;fail();}finally{initializing=null;}})();return initializing;
 }
 async function authorizeCourse(scope){try{
  alive();if(!exactFields(scope,fields)||scope.guildId!==guildId||![scope.actorId,scope.learnerId,scope.sourceChannelId].every(discordId)||!operationId(scope.workId)||scope.courseKey!=='ethical-hacking-reading'||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100||typeof scope.exerciseKey!=='string'||!/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(scope.exerciseKey))return null;
  const s=Object.freeze({...scope});
  const authorized=r=>r?.studentId===s.studentId&&r?.courseKey===s.courseKey;
  if(!authorized(await bounded(()=>base.authorizeCourse(s))))return null;alive();
  const result=await bounded(()=>readPool.query(`SELECT true AS bound FROM formal_review.assignment_bindings b
   JOIN formal_review.work w ON (w.id,w.learner_id,w.course_key)=(b.work_id,b.learner_id,b.course_key)
   JOIN public.certification_course_enrollments c ON (c.discord_user_id,c.course_key,c.assigned_at)=(b.learner_id,b.course_key,b.assigned_at)
   WHERE w.id=$1 AND w.guild_id=$2 AND w.learner_id=$3 AND w.student_id=$4 AND w.course_key=$5 AND w.exercise_key=$6 AND w.channel_id=$7
   AND c.status='active' AND w.created_ms>=ceil(extract(epoch FROM c.assigned_at)*1000)::bigint
   AND w.created_ms<=floor(extract(epoch FROM clock_timestamp())*1000)::bigint
   AND w.expires_ms>floor(extract(epoch FROM clock_timestamp())*1000)::bigint`,[s.workId,s.guildId,s.learnerId,s.studentId,s.courseKey,s.exerciseKey,s.sourceChannelId]));alive();
  if(!Array.isArray(result?.rows)||result.rows.length!==1||result.rows[0]?.bound!==true)return null;
  if(!authorized(await bounded(()=>base.authorizeCourse(s))))return null;alive();return Object.freeze({studentId:s.studentId,courseKey:s.courseKey});
 }catch{return null;}}
 return Object.freeze({enabled:true,get ready(){return ready&&!stopped&&base.ready===true;},initialize,authorizeCourse,dispose(){stopped=true;ready=false;base.dispose();},async drain(){await Promise.allSettled([...pending,...(initializing?[initializing]:[])]);await base.drain();}});
}
