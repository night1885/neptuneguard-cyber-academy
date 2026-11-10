import {discordId,operationId,exactFields} from './formal-review-policy.mjs';
import {hasCompleteAccountAcknowledgment} from './certification-account-acknowledgment.js';
const fail=()=>{throw Error('Review provisioning outcome unconfirmed; inspect the same work ID before retrying');};
const fields=['actorId','guildId','learnerId','studentId','courseKey','exerciseKey','workId','sourceChannelId'];
const ident=x=>typeof x==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(x);
export function createFormalReviewProvisioner(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,initialize:async()=>({ready:false}),provision:async()=>({ok:false}),dispose(){},drain:async()=>{}});
 const {pool,guildId,config,exerciseKeys,expectedDatabase,expectedLogin,verifyAdministrator,authorizeExercise,verifyPrivateChannel,verifyConsent,isReady,providerTimeoutMs=2000}=options;
 if(!discordId(guildId)||config?.enabled!==true||!discordId(config.ownerId)||typeof config.activeAgreementVersion!=='string'||!config.activeAgreementVersion.trim()||!/^[a-f0-9]{64}$/.test(config.activeAgreementSha256??'')||typeof config.comprehensionCheck?.version!=='string'||!config.comprehensionCheck.version.trim()||!Array.isArray(exerciseKeys)||!exerciseKeys.length||!exerciseKeys.every(k=>typeof k==='string'&&/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(k))||![expectedDatabase,expectedLogin].every(ident)||!['query','connect'].every(k=>typeof pool?.[k]==='function')||![verifyAdministrator,authorizeExercise,verifyPrivateChannel,verifyConsent,isReady].every(f=>typeof f==='function')||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<20||providerTimeoutMs>5000)fail();
 const exercises=new Set(exerciseKeys),version=config.activeAgreementVersion,digest=config.activeAgreementSha256,checkVersion=config.comprehensionCheck.version;
 let stopped=false,ready=false;const active=new Set(),pending=new Set();
 function alive(required=true){if(stopped||isReady()!==true||(required&&!ready))fail();}
 function bounded(fn){if(pending.size>=32)fail();const task=Promise.resolve().then(fn);pending.add(task);void task.then(()=>pending.delete(task),()=>pending.delete(task));let timer;return Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Provisioning authority unavailable')),providerTimeoutMs);})]).finally(()=>clearTimeout(timer));}
 async function verify(s){alive();const values=await Promise.all([bounded(()=>verifyAdministrator(s.actorId)),bounded(()=>authorizeExercise(s)),bounded(()=>verifyPrivateChannel(s)),bounded(()=>verifyConsent(s))]);alive();if(values.some(v=>v!==true))fail();}
 async function initialize(){alive(false);try{const p=(await pool.query(`SELECT current_database() AS database,current_user AS login,current_user=session_user AS direct,
  NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted,
  NOT has_schema_privilege(current_user,'public','CREATE') AND NOT has_schema_privilege(current_user,'formal_review','CREATE') AS no_create,
  has_table_privilege(current_user,'formal_review.work','SELECT,INSERT') AND has_table_privilege(current_user,'formal_review.assignment_bindings','SELECT,INSERT') AS provision,
  NOT has_table_privilege(current_user,'formal_review.work','UPDATE,DELETE,TRUNCATE,TRIGGER') AND NOT has_any_column_privilege(current_user,'formal_review.work','UPDATE') AND NOT has_table_privilege(current_user,'formal_review.assignment_bindings','UPDATE,DELETE,TRUNCATE,TRIGGER') AND NOT has_any_column_privilege(current_user,'formal_review.assignment_bindings','UPDATE') AS immutable,
  NOT has_column_privilege(current_user,'public.certification_enrollments','status','UPDATE') AND NOT has_column_privilege(current_user,'public.certification_enrollments','student_id','UPDATE') AND NOT has_column_privilege(current_user,'public.certification_course_enrollments','status','UPDATE') AS no_access_mutation,
  NOT has_column_privilege(current_user,'formal_review.reports','body','SELECT') AND NOT has_column_privilege(current_user,'formal_review.reviews','feedback','SELECT') AND NOT has_table_privilege(current_user,'formal_review.reports','INSERT') AND NOT has_table_privilege(current_user,'formal_review.reviews','INSERT') AS no_content`)).rows[0];alive(false);
  if(p?.database!==expectedDatabase||p.login!==expectedLogin||['direct','restricted','no_create','provision','immutable','no_access_mutation','no_content'].some(k=>p[k]!==true))fail();ready=true;return Object.freeze({ready:true});
 }catch{ready=false;fail();}}
 function provision(scope){
  if(active.size>=8)return Promise.reject(Error('Review provisioning unavailable'));
  const task=(async()=>{alive();if(!exactFields(scope,fields)||scope.guildId!==guildId||![scope.actorId,scope.learnerId,scope.sourceChannelId].every(discordId)||!operationId(scope.workId)||scope.courseKey!=='ethical-hacking-reading'||!exercises.has(scope.exerciseKey)||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100)fail();const s=Object.freeze({...scope});await verify(s);
   const db=await pool.connect();let discard=false;const query=async(sql,args)=>{alive();return db.query(sql,args);};
   try{
    await query('BEGIN');await query("SET LOCAL search_path=pg_catalog; SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='2s'; SET LOCAL idle_in_transaction_session_timeout='10s'");
    const e=(await query('SELECT * FROM public.certification_enrollments WHERE discord_user_id=$1 FOR UPDATE',[s.learnerId])).rows[0];
    if(!e||e.status!=='approved'||e.student_id!==s.studentId||!discordId(e.approved_by)||e.approved_at==null||!hasCompleteAccountAcknowledgment(e)||e.agreement_version!==version||e.agreement_content_sha256!==digest||e.comprehension_check_version!==checkVersion||!['application_closed_at','application_closed_by','application_closed_as'].every(k=>Object.hasOwn(e,k)&&e[k]===null))fail();
    const c=(await query('SELECT *,assigned_at::text AS episode,ceil(extract(epoch FROM assigned_at)*1000)::bigint AS assigned_ms FROM public.certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2 FOR UPDATE',[s.learnerId,s.courseKey])).rows[0];if(!c||c.status!=='active')fail();
    if((await query('SELECT 1 FROM public.certification_course_removals WHERE discord_user_id=$1 AND course_key=$2',[s.learnerId,s.courseKey])).rows.length!==0)fail();
    await verify(s);const stamp=Number((await query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS stamp')).rows[0].stamp);if(!Number.isSafeInteger(stamp)||stamp<Number(c.assigned_ms)||stamp+86400000>8640000000000000)fail();
    const existing=(await query('SELECT w.*,b.assigned_at::text AS episode FROM formal_review.work w LEFT JOIN formal_review.assignment_bindings b ON b.work_id=w.id WHERE w.id=$1',[s.workId])).rows[0];
    let createdAtMs=stamp,expiresAtMs=stamp+86400000;
    if(existing){if(existing.guild_id!==s.guildId||existing.learner_id!==s.learnerId||existing.student_id!==s.studentId||existing.channel_id!==s.sourceChannelId||existing.course_key!==s.courseKey||existing.exercise_key!==s.exerciseKey||existing.episode!==c.episode||Number(existing.created_ms)<Number(c.assigned_ms)||Number(existing.expires_ms)<=stamp)fail();createdAtMs=Number(existing.created_ms);expiresAtMs=Number(existing.expires_ms);}
    else{
     const w=await query('INSERT INTO formal_review.work(id,guild_id,learner_id,student_id,channel_id,course_key,exercise_key,created_ms,expires_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',[s.workId,s.guildId,s.learnerId,s.studentId,s.sourceChannelId,s.courseKey,s.exerciseKey,createdAtMs,expiresAtMs]);if(w.rowCount!==1)fail();
     const b=await query('INSERT INTO formal_review.assignment_bindings(work_id,learner_id,course_key,assigned_at) VALUES($1,$2,$3,$4::timestamptz) RETURNING work_id',[s.workId,s.learnerId,s.courseKey,c.episode]);if(b.rowCount!==1)fail();
    }
    await verify(s);await query('COMMIT');return Object.freeze({ok:true,alreadyProvisioned:!!existing,workId:s.workId,channelId:s.sourceChannelId,createdAtMs,expiresAtMs});
   }catch{try{await db.query('ROLLBACK');}catch{discard=true;}fail();}finally{db.release(discard);}
  })();active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;
 }
 return Object.freeze({enabled:true,get ready(){return ready&&!stopped;},initialize,provision,dispose(){stopped=true;ready=false;},async drain(){await Promise.allSettled([...active,...pending]);}});
}
