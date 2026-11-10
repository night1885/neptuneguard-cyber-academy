import {randomUUID} from 'node:crypto';
import {discordId,operationId,boundedReviewText,reviewClock,REVIEW_POLICY} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal review storage unavailable');};
const integer=x=>{const n=typeof x==='string'&&/^[0-9]+$/.test(x)?Number(x):x;if(!Number.isSafeInteger(n)||n<0)fail();return n;};
const workRow=r=>r?Object.freeze({id:r.id,guildId:r.guild_id,learnerId:r.learner_id,studentId:r.student_id,channelId:r.channel_id,courseKey:r.course_key,exerciseKey:r.exercise_key,revision:integer(r.revision),state:r.state,createdAtMs:integer(r.created_ms),expiresAtMs:integer(r.expires_ms)}):null;
const reportRow=r=>r?Object.freeze({id:r.id,workId:r.work_id,revision:integer(r.revision),body:r.body,bodyDigest:r.body_digest,submittedAtMs:integer(r.submitted_ms),expiresAtMs:integer(r.expires_ms)}):null;
const epoch="floor(extract(epoch FROM clock_timestamp())*1000)::bigint";
export function createFormalReviewStore(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,ready:false,initialize:async()=>({ready:false}),dispose(){},drain:async()=>{}});
 const {pool,expectedDatabase,expectedLogin,ownerId,reviewerMode='owner',authorizeReviewer}=options;
 if(!['owner','current-administrator'].includes(reviewerMode)||(reviewerMode==='current-administrator'&&typeof authorizeReviewer!=='function'))fail();
 const administratorReview=reviewerMode==='current-administrator';
 if(typeof pool?.connect!=='function'||typeof pool?.query!=='function'||!discordId(ownerId)||![expectedDatabase,expectedLogin].every(x=>typeof x==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(x)))fail();
 let stopped=false,ready=false,initializing=null;const active=new Set();
 function alive(){if(stopped||!ready)fail();}
 async function initialize(){
  if(stopped)fail();if(initializing)return initializing;
  initializing=(async()=>{
   const r=(await pool.query(`SELECT current_database() AS db,current_user AS login,current_user=session_user AS direct,
    NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted,
    NOT pg_has_role(current_user,(SELECT nspowner FROM pg_catalog.pg_namespace WHERE nspname='formal_review'),'MEMBER') AS not_owner,
    NOT has_schema_privilege(current_user,'formal_review','CREATE') AS no_create`)).rows[0];
   if(stopped||r?.db!==expectedDatabase||r.login!==expectedLogin||['direct','restricted','not_owner','no_create'].some(k=>r[k]!==true))fail();
   for(const table of ['work','reports','reviews','operations']){
    const p=(await pool.query(`SELECT has_table_privilege(current_user,$1,'SELECT') AS readable,
     has_table_privilege(current_user,$1,'DELETE,TRUNCATE,TRIGGER') AS destructive,
     has_any_column_privilege(current_user,$1,'UPDATE') AS writable`,['formal_review.'+table])).rows[0];
    if(p?.readable!==true||p.destructive!==false||(table!=='work'&&p.writable!==false))fail();
   }
   const grants=(await pool.query(`SELECT
    has_column_privilege(current_user,'formal_review.work','revision','UPDATE') AND has_column_privilege(current_user,'formal_review.work','state','UPDATE') AND has_column_privilege(current_user,'formal_review.work','expires_ms','UPDATE') AS transitions,
    NOT EXISTS(SELECT 1 FROM unnest(ARRAY['id','guild_id','learner_id','student_id','channel_id','course_key','exercise_key','created_ms']) AS c(name) WHERE has_column_privilege(current_user,'formal_review.work',c.name,'UPDATE')) AS immutable,
    has_table_privilege(current_user,'formal_review.reports','INSERT') AND has_table_privilege(current_user,'formal_review.reviews','INSERT') AND has_table_privilege(current_user,'formal_review.operations','INSERT') AS inserts,
    NOT has_table_privilege(current_user,'formal_review.work','INSERT') AS no_provision`)).rows[0];
   const integrity=(await pool.query(`SELECT
    (SELECT count(*) FROM pg_catalog.pg_constraint WHERE connamespace='formal_review'::regnamespace AND convalidated AND conname IN ('formal_report_text','formal_report_digest','formal_report_deadline'))=3 AS checks,
    (SELECT count(*) FROM pg_catalog.pg_trigger WHERE NOT tgisinternal AND tgenabled IN ('O','A') AND tgname IN ('formal_work_immutable','formal_report_immutable','formal_feedback_immutable','formal_operation_immutable') AND tgrelid IN ('formal_review.work'::regclass,'formal_review.reports'::regclass,'formal_review.reviews'::regclass,'formal_review.operations'::regclass))=4 AS triggers`)).rows[0];
   if(stopped||!grants||Object.values(grants).some(x=>x!==true)||integrity?.checks!==true||integrity.triggers!==true)fail();ready=true;return Object.freeze({ready:true});
  })();
  try{return await initializing;}catch{ready=false;initializing=null;fail();}
 }
 function transaction(callback){
  alive();if(typeof callback!=='function'||active.size>=10)fail();
  const task=(async()=>{const db=await pool.connect();let discard=false,locked=null,mutation=null;
   const query=async(sql,args)=>{alive();return db.query(sql,args);};
   async function scope(s){
    alive();if(!locked||s?.workId!==locked.id||s.guildId!==locked.guildId||s.learnerId!==locked.learnerId||s.studentId!==locked.studentId||s.courseKey!==locked.courseKey||s.exerciseKey!==locked.exerciseKey||s.sourceChannelId!==locked.channelId||!discordId(s.actorId))fail();
    const normalized=Object.freeze({actorId:s.actorId,guildId:locked.guildId,learnerId:locked.learnerId,studentId:locked.studentId,courseKey:locked.courseKey,exerciseKey:locked.exerciseKey,workId:locked.id,sourceChannelId:locked.channelId});
    if(normalized.actorId!==locked.learnerId){
     if(administratorReview){if(await authorizeReviewer(normalized)!==true)fail();alive();}
     else if(normalized.actorId!==ownerId)fail();
    }
    return normalized;
   }
   const one=r=>{if(r.rowCount!==1||r.rows.length!==1)fail();return r.rows[0];};
   try{
    alive();await db.query('BEGIN');await db.query("SET LOCAL search_path=pg_catalog; SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='3s'; SET LOCAL idle_in_transaction_session_timeout='10s'");
    const tx=Object.freeze({
     async lockWork(id){if(locked||!operationId(id))fail();locked=workRow((await query(`SELECT * FROM formal_review.work WHERE id=$1 AND expires_ms>${epoch} FOR UPDATE`,[id])).rows[0]);return locked;},
     async findOperation(id,actor,op){if(id!==locked?.id||!discordId(actor)||!operationId(op))fail();const r=(await query(`SELECT * FROM formal_review.operations WHERE work_id=$1 AND actor_id=$2 AND operation_id=$3 AND expires_ms>${epoch}`,[id,actor,op])).rows[0];return r?Object.freeze({workId:r.work_id,operationId:r.operation_id,digest:r.digest,reportId:r.report_id,revision:integer(r.revision),expiresAtMs:integer(r.expires_ms)}):null;},
     async readReport(id,reportId){if(id!==locked?.id||!operationId(reportId))fail();return reportRow((await query(`SELECT * FROM formal_review.reports WHERE work_id=$1 AND id=$2 AND expires_ms>${epoch}`,[id,reportId])).rows[0]);},
     async readReview(id,reportId){if(id!==locked?.id||!operationId(reportId))fail();const r=(await query(`SELECT * FROM formal_review.reviews WHERE work_id=$1 AND report_id=$2 AND expires_ms>${epoch}`,[id,reportId])).rows[0];return r?Object.freeze({reportId:r.report_id,expectedRevision:integer(r.expected_revision),decision:r.decision,feedback:r.feedback,expiresAtMs:integer(r.expires_ms)}):null;},
     async insertSubmission(s,p){s=await scope(s);if(mutation||s.actorId!==locked.learnerId||!['working','changes-requested'].includes(locked.state)||p?.expectedRevision!==locked.revision||!operationId(p.operationId)||!boundedReviewText(p.body)||!/^[a-f0-9]{64}$/.test(p.bodyDigest??'')||p.sourceChannelId!==locked.channelId||!discordId(p.sourceMessageId)||p.expiresAtMs!==reviewClock(p.submittedAtMs)+REVIEW_POLICY.reportMs||!Number.isSafeInteger(p.sourceCreatedAtMs)||p.sourceCreatedAtMs<locked.createdAtMs)fail();
      const id=randomUUID(),revision=locked.revision+1;
      one(await query(`INSERT INTO formal_review.reports(id,work_id,revision,body,body_digest,source_channel_id,source_message_id,source_created_ms,submitted_ms,expires_ms)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 WHERE $9::bigint<=${epoch} AND $10::bigint>${epoch} RETURNING id`,[id,locked.id,revision,p.body,p.bodyDigest,p.sourceChannelId,p.sourceMessageId,p.sourceCreatedAtMs,p.submittedAtMs,p.expiresAtMs]));
      one(await query("UPDATE formal_review.work SET revision=$2,state='submitted',expires_ms=greatest(expires_ms,$3) WHERE id=$1 AND revision=$4 RETURNING id",[locked.id,revision,p.expiresAtMs,locked.revision]));
      mutation={action:'submit',actor:s.actorId,scope:s,operationId:p.operationId,reportId:id,revision,expiresAtMs:p.expiresAtMs};return Object.freeze({reportId:id,revision,expiresAtMs:p.expiresAtMs});
     },
     async insertReview(s,p){s=await scope(s);if(mutation||s.actorId===locked.learnerId||locked.state!=='submitted'||p?.expectedRevision!==locked.revision||!operationId(p.operationId)||!operationId(p.reportId)||!['changes-requested','review-recorded'].includes(p.decision)||!boundedReviewText(p.feedback))fail();
      const revision=locked.revision+1;
      one(await query(`INSERT INTO formal_review.reviews(report_id,work_id,expected_revision,new_revision,reviewer_id,decision,feedback,expires_ms)
       SELECT id,work_id,revision,$3,$4,$5,$6,expires_ms FROM formal_review.reports WHERE id=$1 AND work_id=$2 AND revision=$7 AND expires_ms=$8 AND expires_ms>${epoch} RETURNING report_id`,[p.reportId,locked.id,revision,s.actorId,p.decision,p.feedback,locked.revision,p.expiresAtMs]));
      one(await query('UPDATE formal_review.work SET revision=$2,state=$3 WHERE id=$1 AND revision=$4 RETURNING id',[locked.id,revision,p.decision,locked.revision]));
      mutation={action:'review',actor:s.actorId,scope:s,operationId:p.operationId,reportId:p.reportId,revision,expiresAtMs:p.expiresAtMs};return Object.freeze({reportId:p.reportId,revision,expiresAtMs:p.expiresAtMs});
     },
     async saveOperation(s,r){s=await scope(s);if(!mutation||mutation.saved||r?.workId!==locked.id||s.actorId!==mutation.actor||r.operationId!==mutation.operationId||r.reportId!==mutation.reportId||r.revision!==mutation.revision||r.expiresAtMs!==mutation.expiresAtMs||!/^[a-f0-9]{64}$/.test(r.digest??''))fail();
      one(await query('INSERT INTO formal_review.operations(work_id,actor_id,operation_id,action,digest,report_id,revision,expires_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING operation_id',[locked.id,s.actorId,r.operationId,mutation.action,r.digest,r.reportId,r.revision,r.expiresAtMs]));mutation.saved=true;
     }
    });
    const result=await callback(tx);alive();if(mutation&&!mutation.saved)fail();if(mutation)await scope(mutation.scope);await db.query('COMMIT');return result;
   }catch{try{await db.query('ROLLBACK');}catch{discard=true;}fail();}finally{db.release(discard);}
  })();
  active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;
 }
 return Object.freeze({enabled:true,get ready(){return ready&&!stopped;},initialize,transaction,dispose(){stopped=true;ready=false;},async drain(){await Promise.allSettled([...active,...(initializing?[initializing]:[])]);}});
}
