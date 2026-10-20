import {buildSharedCompletionSnapshot} from './certification-retention-shared-snapshot.js';
const id=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const ident=v=>typeof v==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const date=v=>v instanceof Date&&Number.isFinite(v.getTime());
const names=['certification_enrollments','certification_course_enrollments','certification_lab_requests','certification_audit_events'];
// Staged library only. No runtime binding, production credentials, scheduler, or default enablement.
export function createSharedEnrollmentRetentionExecutor(pool,config={}, {reviewPreservation,now=()=>new Date()}={}){
  const {ownerId,executorRole,expectedDatabase,schema,enabled=false,reviewTimeoutMs=1000}=config;
  if(!id(ownerId)||!ident(executorRole)||executorRole==='neptuneguard_certification_app'||!ident(expectedDatabase)||!ident(schema)||
    typeof reviewPreservation!=='function'||typeof now!=='function'||!Number.isSafeInteger(reviewTimeoutMs)||reviewTimeoutMs<1||reviewTimeoutMs>1000)throw new Error('Explicit shared retention configuration and review provider required');
  const q=names.map(n=>`"${schema}"."${n}"`),format='YYYY-MM-DD"T"HH24:MI:SS.US"Z"';
  return Object.freeze({async execute(actorId,subjectId,expectedSnapshotSha256){
    if(enabled!==true||actorId!==ownerId||!id(subjectId)||!hash(expectedSnapshotSha256))throw new Error('Shared retention execution not authorized');
    let db;try{db=await pool.connect();}catch{throw new Error('Shared retention connection unavailable');}
    let discard=false,stage='transaction';const started=performance.now();
    const query=(...args)=>{if(performance.now()-started>15000)throw new Error();return db.query(...args);};
    try{
      await query('BEGIN');await query("SET LOCAL lock_timeout='2s'");await query("SET LOCAL statement_timeout='5s'");
      await query("SET LOCAL idle_in_transaction_session_timeout='10s'");await query('SET LOCAL search_path=pg_catalog');
      stage='identity';
      const who=(await query(`SELECT current_database() AS database,current_user AS role,session_user AS session_role,
        current_setting('session_replication_role')='origin' AS origin,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND
          (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted`)).rows[0];
      if(who?.database!==expectedDatabase||who.role!==executorRole||who.session_role!==executorRole||who.origin!==true||who.restricted!==true)throw new Error();
      const relations=(await query(`SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,pg_has_role(current_user,c.relowner,'MEMBER') AS owner_member
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=ANY($2::text[])`,[schema,names])).rows;
      if(relations.length!==4||names.some(n=>!relations.some(r=>r.relname===n&&r.relkind==='r'&&r.relrowsecurity===false&&r.relforcerowsecurity===false&&r.owner_member===false)))throw new Error();
      stage='privileges';
      const access=(await query(`SELECT
        has_schema_privilege(current_user,$5,'USAGE') AND NOT has_schema_privilege(current_user,$5,'CREATE') AS schema_access,
        has_table_privilege(current_user,to_regclass($1),'DELETE') AND has_column_privilege(current_user,to_regclass($1),'updated_at','UPDATE') AS parent_write,
        NOT has_any_column_privilege(current_user,to_regclass($1),'INSERT') AND NOT has_table_privilege(current_user,to_regclass($1),'TRUNCATE,TRIGGER')
          AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=to_regclass($1) AND a.attnum>0 AND NOT a.attisdropped
            AND a.attname<>'updated_at' AND has_column_privilege(current_user,a.attrelid,a.attnum,'UPDATE')) AS parent_limits,
        (SELECT bool_and(has_column_privilege(current_user,to_regclass($1),c,'SELECT')) FROM unnest(ARRAY['discord_user_id','status','student_id','approved_by','approved_at','application_closed_at','application_closed_by','application_closed_as']) AS cols(c)) AS parent_read,
        has_table_privilege(current_user,to_regclass($2),'DELETE') AND NOT has_any_column_privilege(current_user,to_regclass($2),'INSERT')
          AND NOT has_any_column_privilege(current_user,to_regclass($2),'UPDATE') AND NOT has_table_privilege(current_user,to_regclass($2),'TRUNCATE,TRIGGER') AS course_write,
        (SELECT bool_and(has_column_privilege(current_user,to_regclass($2),c,'SELECT')) FROM unnest(ARRAY['discord_user_id','course_key','status','assigned_at','assigned_by','completed_at','completed_by']) AS cols(c)) AS course_read,
        has_column_privilege(current_user,to_regclass($3),'discord_user_id','SELECT') AS lab_read,
        NOT EXISTS(SELECT 1 FROM unnest(ARRAY[to_regclass($3)::oid,to_regclass($4)::oid]) AS targets(oid)
          WHERE has_table_privilege(current_user,oid,'DELETE,TRUNCATE,TRIGGER') OR has_any_column_privilege(current_user,oid,'INSERT') OR has_any_column_privilege(current_user,oid,'UPDATE')) AS unrelated_limits`,[...q,schema])).rows[0];
      if(!access||['schema_access','parent_write','parent_limits','parent_read','course_write','course_read','lab_read','unrelated_limits'].some(k=>access[k]!==true))throw new Error();
      stage='locking';await query(`LOCK TABLE ${q[0]} IN SHARE ROW EXCLUSIVE MODE`);
      const parents=(await query(`SELECT discord_user_id,status,student_id,approved_by,to_char(approved_at AT TIME ZONE 'UTC','${format}') AS approved_at_utc,
        application_closed_at,application_closed_by,application_closed_as FROM ${q[0]} WHERE discord_user_id=$1 FOR UPDATE`,[subjectId])).rows;
      if(!parents.length){await query('COMMIT');return Object.freeze({outcome:'not_found',deletedEnrollments:0,deletedCourses:0});}
      if(parents.length!==1)throw new Error();
      await query(`LOCK TABLE ${q[1]} IN SHARE ROW EXCLUSIVE MODE`);
      stage='dependencies';
      const dependencies=(await query(`SELECT pn.nspname AS parent_schema,p.relname AS parent_table,n.nspname AS child_schema,c.relname AS child_table,k.convalidated,k.condeferrable,k.confdeltype,
        ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY AS x(num,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.num ORDER BY x.ord) AS child_columns,
        ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY AS x(num,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.num ORDER BY x.ord) AS parent_columns
        FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_catalog.pg_class p ON p.oid=k.confrelid JOIN pg_catalog.pg_namespace pn ON pn.oid=p.relnamespace
        WHERE k.contype='f' AND k.confrelid IN(to_regclass($1),to_regclass($2))`,[q[0],q[1]])).rows;
      if(dependencies.length!==2||['certification_course_enrollments','certification_lab_requests'].some(n=>!dependencies.some(d=>d.parent_schema===schema&&d.parent_table===names[0]&&d.child_schema===schema&&d.child_table===n&&
        d.convalidated===true&&d.condeferrable===false&&d.confdeltype===(n===names[1]?'r':'a')&&d.child_columns?.length===1&&d.child_columns[0]==='discord_user_id'&&d.parent_columns?.length===1&&d.parent_columns[0]==='discord_user_id')))throw new Error();
      const safe=(await query(`SELECT NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid IN(to_regclass($1),to_regclass($2)) AND NOT tgisinternal AND (tgtype & 8)=8) AS no_delete_triggers,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class IN(to_regclass($1),to_regclass($2))) AS no_rules`,[q[0],q[1]])).rows[0];
      if(safe?.no_delete_triggers!==true||safe.no_rules!==true)throw new Error();
      stage='snapshot';
      const courses=(await query(`SELECT discord_user_id,course_key,status,assigned_by,completed_by,
        to_char(assigned_at AT TIME ZONE 'UTC','${format}') AS assigned_at_utc,to_char(completed_at AT TIME ZONE 'UTC','${format}') AS completed_at_utc
        FROM ${q[1]} WHERE discord_user_id=$1 ORDER BY course_key LIMIT 51`,[subjectId])).rows;
      const links=(await query(`SELECT EXISTS(SELECT 1 FROM ${q[2]} WHERE discord_user_id=$1) AS has_labs`,[subjectId])).rows[0];
      if(links?.has_labs!==false)throw new Error();
      const evidence=()=>buildSharedCompletionSnapshot({database:expectedDatabase,schema,subjectId,enrollment:parents[0],courses,labCount:0,unreviewedDependencies:[],asOf:now()});
      const snapshot=evidence();if(snapshot.snapshotSha256!==expectedSnapshotSha256)throw new Error();
      stage='preservation';let decision,timer;const controller=new AbortController();
      try{decision=await Promise.race([
        Promise.resolve().then(()=>reviewPreservation(Object.freeze({actorId,subjectId,category:snapshot.category,snapshotSha256:snapshot.snapshotSha256,courseKeys:snapshot.courseKeys,signal:controller.signal}))),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error()),reviewTimeoutMs);})
      ]);}finally{clearTimeout(timer);controller.abort();}
      const checkedAt=now();
      if(!date(checkedAt)||decision?.decision!=='allow'||decision.actorId!==actorId||decision.subjectId!==subjectId||decision.category!==snapshot.category||decision.snapshotSha256!==expectedSnapshotSha256||
        typeof decision.reference!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(decision.reference)||!date(decision.reviewedAt)||!date(decision.expiresAt)||
        decision.reviewedAt>checkedAt||decision.expiresAt<=checkedAt||decision.expiresAt-decision.reviewedAt>300000||evidence().snapshotSha256!==expectedSnapshotSha256)throw new Error();
      stage='course_deletion';
      const children=await query(`DELETE FROM ${q[1]} WHERE discord_user_id=$1 AND status='completed' AND course_key=ANY($2::text[]) RETURNING course_key`,[subjectId,snapshot.courseKeys]);
      const keys=new Set(children.rows.map(r=>r.course_key));
      if(children.rowCount!==snapshot.courseCount||children.rows.length!==snapshot.courseCount||keys.size!==snapshot.courseCount||snapshot.courseKeys.some(k=>!keys.has(k)))throw new Error();
      stage='parent_deletion';const e=parents[0];
      const parent=await query(`DELETE FROM ${q[0]} WHERE discord_user_id=$1 AND status=$2 AND student_id=$3 AND approved_by=$4 AND approved_at=$5::timestamptz
        AND application_closed_at IS NULL AND application_closed_by IS NULL AND application_closed_as IS NULL
        AND NOT EXISTS(SELECT 1 FROM ${q[1]} WHERE discord_user_id=$1) AND NOT EXISTS(SELECT 1 FROM ${q[2]} WHERE discord_user_id=$1) RETURNING discord_user_id`,[subjectId,e.status,e.student_id,e.approved_by,e.approved_at_utc]);
      if(parent.rowCount!==1||parent.rows.length!==1||parent.rows[0].discord_user_id!==subjectId)throw new Error();
      stage='commit';await query('COMMIT');return Object.freeze({outcome:'deleted',deletedEnrollments:1,deletedCourses:snapshot.courseCount,preservationReference:decision.reference});
    }catch{try{await db.query('ROLLBACK');}catch{discard=true;}throw new Error(`Shared retention failed at ${stage}; review current state before retrying`);}
    finally{db.release(discard);}
  }});
}
