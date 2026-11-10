import {discordId,operationId,exactFields} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal course authorization unavailable');};
const ident=x=>typeof x==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(x);
const courseKey='ethical-hacking-reading';
const queryText="SELECT e.*,c.status AS course_status,c.course_key AS authorized_course_key FROM public.certification_enrollments e JOIN public.certification_course_enrollments c ON c.discord_user_id=e.discord_user_id WHERE e.discord_user_id=$1 AND c.course_key=$2 AND e.status='approved' AND c.status='active'";
const removalQuery="SELECT NOT EXISTS(SELECT 1 FROM public.certification_course_removals WHERE discord_user_id=$1 AND course_key=$2) AS clear";
const normalize=x=>typeof x==='string'?x.replace(/\s+/g,' ').trim():'';
const nativeQuery=queryText.replaceAll('public.','');
const fields=['actorId','guildId','learnerId','studentId','courseKey','exerciseKey','workId','sourceChannelId'];
const loadLifecycle=async(pool,config,options)=>{const {createCertificationCourseLifecycle}=await import('./certification-course-lifecycle.js');return createCertificationCourseLifecycle(pool,config,options);};
export function createFormalReviewCourseAuthorization(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,initialize:async()=>({ready:false}),authorizeCourse:async()=>null,dispose(){},drain:async()=>{}});
 const {guildId,ownerId,readPool,config,expectedDatabase,expectedLogin,isReady,createLifecycle=loadLifecycle,providerTimeoutMs=1000,reviewerMode='owner',authorizeReviewer}=options;
 if(!['owner','current-administrator'].includes(reviewerMode)||(reviewerMode==='current-administrator'&&typeof authorizeReviewer!=='function'))fail();
 const administratorReview=reviewerMode==='current-administrator';
 if(!discordId(guildId)||!discordId(ownerId)||typeof readPool?.query!=='function'||!ident(expectedDatabase)||!ident(expectedLogin)||typeof isReady!=='function'||typeof createLifecycle!=='function'||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<20||providerTimeoutMs>2000||config?.enabled!==true||config.ownerId!==ownerId||typeof config.activeAgreementVersion!=='string'||!config.activeAgreementVersion.trim()||!/^[a-f0-9]{64}$/.test(config.activeAgreementSha256??'')||typeof config.comprehensionCheck?.version!=='string'||!config.comprehensionCheck.version.trim()||(config.courseRemovalEnabled!==undefined&&typeof config.courseRemovalEnabled!=='boolean'))fail();
 const removalChecks=config.courseRemovalEnabled===true;
 const readFacade=Object.freeze({query(sql,args){if(normalize(sql)!==nativeQuery||!Array.isArray(args)||args.length!==2||!discordId(args[0])||args[1]!==courseKey)fail();return readPool.query(queryText,args);}});
 const settings=Object.freeze({...config,comprehensionCheck:Object.freeze({...config.comprehensionCheck})});
 let stopped=false,ready=false,lifecycle=null,initializing=null;const pending=new Set();
 function alive(requireReady=true){if(stopped||(requireReady&&(!ready||isReady()!==true)))fail();}
 function bounded(fn){if(pending.size>=8)fail();const raw=Promise.resolve().then(fn);pending.add(raw);void raw.then(()=>pending.delete(raw),()=>pending.delete(raw));let timer;return Promise.race([raw,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Formal course authorization unavailable')),providerTimeoutMs);})]).finally(()=>clearTimeout(timer));}
 async function initialize(){
  alive(false);if(ready)return Object.freeze({ready:true});if(initializing)return initializing;
  initializing=Promise.resolve().then(async()=>{try{
   const r=(await bounded(()=>readPool.query(`SELECT current_database() AS database,current_user AS login,current_user=session_user AS direct,
    NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted,
    current_schemas(false)::text[] AS schemas,
    (SELECT setting::bigint FROM pg_catalog.pg_settings WHERE name='statement_timeout') AS statement_ms,
    NOT has_schema_privilege(current_user,'public','CREATE') AS no_create,
    has_table_privilege(current_user,'public.certification_enrollments','SELECT') AND has_table_privilege(current_user,'public.certification_course_enrollments','SELECT') AS reads,
    NOT has_table_privilege(current_user,'public.certification_enrollments','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') AND NOT has_any_column_privilege(current_user,'public.certification_enrollments','INSERT,UPDATE') AND NOT has_table_privilege(current_user,'public.certification_course_enrollments','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') AND NOT has_any_column_privilege(current_user,'public.certification_course_enrollments','INSERT,UPDATE') AS no_writes`))).rows[0];alive(false);
   if(r?.database!==expectedDatabase||r.login!==expectedLogin||['direct','restricted','no_create','reads','no_writes'].some(k=>r[k]!==true)||!Array.isArray(r.schemas)||!['public','pg_catalog,public'].includes(r.schemas.join(','))||!Number.isSafeInteger(Number(r.statement_ms))||Number(r.statement_ms)<1||Number(r.statement_ms)>5000)fail();
   if(removalChecks){
    const p=(await bounded(()=>readPool.query(`SELECT
     has_column_privilege(current_user,'public.certification_course_removals','discord_user_id','SELECT') AND has_column_privilege(current_user,'public.certification_course_removals','course_key','SELECT') AS removal_read,
     NOT has_table_privilege(current_user,'public.certification_course_removals','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER') AND NOT has_any_column_privilege(current_user,'public.certification_course_removals','INSERT,UPDATE') AS removal_no_writes`))).rows[0];alive(false);
    if(p?.removal_read!==true||p.removal_no_writes!==true)fail();
   }
   const service=await bounded(()=>createLifecycle(readFacade,settings,{courseKeys:[courseKey]}));alive(false);if(typeof service?.getCourseAuthorization!=='function')fail();lifecycle=service;ready=true;return Object.freeze({ready:true});
  }catch{ready=false;fail();}finally{initializing=null;}});return initializing;
 }
 async function removalClear(learnerId){if(!removalChecks)return true;const result=await bounded(()=>readPool.query(removalQuery,[learnerId,courseKey]));alive();return Array.isArray(result?.rows)&&result.rows.length===1&&result.rows[0]?.clear===true;}
 async function reviewerClear(scope){if(scope.actorId===scope.learnerId)return true;if(!administratorReview)return scope.actorId===ownerId;const verified=await bounded(()=>authorizeReviewer(scope));alive();return verified===true;}
 async function authorizeCourse(scope){try{
  alive();if(!exactFields(scope,fields)||scope.guildId!==guildId||scope.courseKey!==courseKey||!discordId(scope.learnerId)||(!administratorReview&&scope.learnerId===ownerId)||!discordId(scope.actorId)||!discordId(scope.sourceChannelId)||!operationId(scope.workId)||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100||typeof scope.exerciseKey!=='string'||!/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(scope.exerciseKey))fail();
  const selected=Object.freeze({...scope}),learnerId=selected.learnerId,studentId=selected.studentId;
  if(!await reviewerClear(selected)||!await removalClear(learnerId))return null;
  const r=await bounded(()=>lifecycle.getCourseAuthorization(learnerId,courseKey));alive();
  if(r?.student_id!==studentId||r.course_key!==courseKey||!await removalClear(learnerId)||!await reviewerClear(selected))return null;alive();return Object.freeze({studentId,courseKey});
 }catch{return null;}}
 return Object.freeze({enabled:true,get ready(){return ready&&!stopped;},initialize,authorizeCourse,dispose(){stopped=true;ready=false;},async drain(){await Promise.allSettled([...pending,...(initializing?[initializing]:[])]);}});
}
