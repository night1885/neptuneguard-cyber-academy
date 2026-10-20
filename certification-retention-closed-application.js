import { applicationDeletionEligibleAt } from './certification-retention-deadlines.js';
const discordId=v=>typeof v==='string' && /^[0-9]{17,20}$/.test(v);
const identifier=v=>typeof v==='string' && /^[a-z_][a-z0-9_]{0,62}$/.test(v);
const instant=v=>v instanceof Date && Number.isFinite(v.getTime()) && v.getUTCFullYear()>=1970 && v.getUTCFullYear()<=9998;
const ref=v=>typeof v==='string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
const names=['certification_enrollments','certification_course_enrollments','certification_lab_requests','certification_audit_events'];

// Explicit library only: no environment loader, runtime route, scheduler, or default execution.
export function createClosedApplicationRetentionExecutor(pool,config={}, {reviewPreservation,now=()=>new Date()}={}) {
  const {ownerId,executorRole,expectedDatabase,schema,enabled=false,reviewTimeoutMs=1000}=config;
  if(!discordId(ownerId)||!identifier(executorRole)||!identifier(schema)||!identifier(expectedDatabase)||
    executorRole==='neptuneguard_certification_app'||!Number.isSafeInteger(reviewTimeoutMs)||reviewTimeoutMs<1||reviewTimeoutMs>1000||typeof reviewPreservation!=='function'||typeof now!=='function') {
    throw new Error('Explicit retention identity, schema and review provider required');
  }
  const qualified=names.map(name=>`"${schema}"."${name}"`);
  return Object.freeze({async execute(actorId,subjectId) {
    if(enabled!==true||actorId!==ownerId||!discordId(subjectId)) throw new Error('Retention execution not authorized');
    const db=await pool.connect();let discard=false,stage='transaction';
    const started=performance.now();
    const query=(...args)=>{if(performance.now()-started>15000)throw new Error('Transaction admission deadline exceeded');return db.query(...args);};
    try {
      await query('BEGIN');
      await query("SET LOCAL lock_timeout='2s'");
      await query("SET LOCAL statement_timeout='5s'");
      await query("SET LOCAL idle_in_transaction_session_timeout='10s'");
      stage='identity';
      const identity=(await query(`SELECT current_database() AS database,current_user AS role,session_user AS session_role,
        current_setting('session_replication_role')='origin' AS origin,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND
          (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted`)).rows[0];
      if(identity?.database!==expectedDatabase||identity.role!==executorRole||identity.session_role!==executorRole||
        identity.origin!==true||identity.restricted!==true) throw new Error();
      const relations=(await query(`SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,
        pg_has_role(current_user,c.relowner,'MEMBER') AS owner_member
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname=$1 AND c.relname=ANY($2::text[])`,[schema,names])).rows;
      if(relations.length!==4||names.some(name=>!relations.some(r=>r.relname===name&&r.relkind==='r'&&
        r.relrowsecurity===false&&r.relforcerowsecurity===false&&r.owner_member===false))) throw new Error();
      stage='privileges';
      const access=(await query(`SELECT
        has_schema_privilege(current_user,$5,'USAGE') AND NOT has_schema_privilege(current_user,$5,'CREATE') AS schema_access,
        has_table_privilege(current_user,to_regclass($1),'DELETE') AS can_delete,
        has_column_privilege(current_user,to_regclass($1),'updated_at','UPDATE') AS can_lock,
        NOT has_any_column_privilege(current_user,to_regclass($1),'INSERT')
          AND NOT has_table_privilege(current_user,to_regclass($1),'TRUNCATE,TRIGGER') AS parent_limits,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=to_regclass($1)
          AND a.attnum>0 AND NOT a.attisdropped AND a.attname<>'updated_at'
          AND has_column_privilege(current_user,a.attrelid,a.attnum,'UPDATE')) AS update_scope,
        (SELECT bool_and(has_column_privilege(current_user,to_regclass($1),c,'SELECT'))
          FROM unnest(ARRAY['discord_user_id','status','student_id','approved_by','approved_at',
            'application_closed_at','application_closed_by','application_closed_as']) AS cols(c)) AS parent_read,
        has_column_privilege(current_user,to_regclass($2),'discord_user_id','SELECT')
          AND has_column_privilege(current_user,to_regclass($3),'discord_user_id','SELECT') AS child_read,
        NOT EXISTS(SELECT 1 FROM unnest(ARRAY[to_regclass($2)::oid,to_regclass($3)::oid,to_regclass($4)::oid]) AS targets(oid)
          WHERE has_table_privilege(current_user,oid,'DELETE,TRUNCATE,TRIGGER') OR
          has_any_column_privilege(current_user,oid,'INSERT') OR has_any_column_privilege(current_user,oid,'UPDATE')) AS child_limits`,
        [...qualified,schema])).rows[0];
      const flags=['schema_access','can_delete','can_lock','parent_limits','update_scope','parent_read','child_read','child_limits'];
      if(!access||flags.some(k=>access[k]!==true)) throw new Error();
      stage='dependencies';
      await query(`LOCK TABLE ${qualified[0]} IN SHARE ROW EXCLUSIVE MODE`);
      const dependencies=(await query(`SELECT n.nspname AS child_schema,c.relname AS child_table,
        k.convalidated,k.condeferrable,k.confdeltype,
        ARRAY(SELECT a.attname::text FROM unnest(k.conkey) WITH ORDINALITY AS x(num,ord)
          JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=x.num ORDER BY x.ord) AS child_columns,
        ARRAY(SELECT a.attname::text FROM unnest(k.confkey) WITH ORDINALITY AS x(num,ord)
          JOIN pg_catalog.pg_attribute a ON a.attrelid=k.confrelid AND a.attnum=x.num ORDER BY x.ord) AS parent_columns
        FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE k.contype='f' AND k.confrelid=to_regclass($1)`,[qualified[0]])).rows;
      if(dependencies.length!==2||['certification_course_enrollments','certification_lab_requests'].some(name=>
        !dependencies.some(d=>d.child_schema===schema&&d.child_table===name&&d.convalidated===true&&
          d.condeferrable===false&&d.confdeltype===(name==='certification_course_enrollments'?'r':'a')&&
          d.child_columns?.length===1&&d.child_columns[0]==='discord_user_id'&&
          d.parent_columns?.length===1&&d.parent_columns[0]==='discord_user_id'))) throw new Error();
      const safeguards=(await query(`SELECT
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass($1) AND NOT tgisinternal AND (tgtype & 8)=8) AS no_delete_triggers,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=to_regclass($1)) AS no_rules`,[qualified[0]])).rows[0];
      if(safeguards?.no_delete_triggers!==true||safeguards.no_rules!==true) throw new Error();
      stage='eligibility';
      const row=(await query(`SELECT discord_user_id,status,student_id,approved_by,approved_at,
        application_closed_at,application_closed_by,application_closed_as,
        application_closed_at=date_trunc('milliseconds',application_closed_at) AS exact_closure
        FROM ${qualified[0]} WHERE discord_user_id=$1 FOR UPDATE`,[subjectId])).rows[0];
      if(!row){await query('COMMIT');return Object.freeze({outcome:'not_found',deleted:0});}
      if(row.discord_user_id!==subjectId||row.status!=='denied'||row.student_id!==null||row.approved_by!==null||row.approved_at!==null||
        !instant(row.application_closed_at)||!discordId(row.application_closed_by)||row.exact_closure!==true||
        !['denied','withdrawn','abandoned'].includes(row.application_closed_as)) throw new Error();
      const deadline=applicationDeletionEligibleAt(row.application_closed_at),time=now();
      if(!instant(time)||deadline.getTime()>time.getTime()) throw new Error();
      const children=(await query(`SELECT EXISTS(SELECT 1 FROM ${qualified[1]} WHERE discord_user_id=$1) AS courses_exist,
        EXISTS(SELECT 1 FROM ${qualified[2]} WHERE discord_user_id=$1) AS labs_exist`,[subjectId])).rows[0];
      if(children?.courses_exist!==false||children.labs_exist!==false) throw new Error();
      stage='preservation';
      const closedAt=row.application_closed_at.toISOString();
      let decision,timer;const controller=new AbortController();
      try {
        decision=await Promise.race([
          Promise.resolve().then(()=>reviewPreservation(Object.freeze({actorId,subjectId,category:'closed_application',closedAt,signal:controller.signal}))),
          new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Preservation review deadline exceeded')),reviewTimeoutMs);})
        ]);
      } finally {clearTimeout(timer);controller.abort();}
      const checkedAt=now();
      if(!instant(checkedAt)||decision?.decision!=='allow'||decision.actorId!==actorId||decision.subjectId!==subjectId||
        decision.category!=='closed_application'||decision.closedAt!==closedAt||!ref(decision.reference)||
        !instant(decision.reviewedAt)||!instant(decision.expiresAt)||decision.reviewedAt>checkedAt||decision.expiresAt<=checkedAt||
        decision.expiresAt-decision.reviewedAt>300000||checkedAt.getTime()<deadline.getTime()) throw new Error();
      stage='deletion';
      const deletion=await query(`DELETE FROM ${qualified[0]} WHERE discord_user_id=$1 AND status='denied'
        AND student_id IS NULL AND approved_by IS NULL AND approved_at IS NULL
        AND application_closed_at=$2::timestamptz AND application_closed_by=$3 AND application_closed_as=$4
        RETURNING discord_user_id`,[subjectId,closedAt,row.application_closed_by,row.application_closed_as]);
      if(deletion.rowCount!==1||deletion.rows.length!==1||deletion.rows[0].discord_user_id!==subjectId) throw new Error();
      stage='commit';await query('COMMIT');
      return Object.freeze({outcome:'deleted',deleted:1,preservationReference:decision.reference});
    } catch {
      try{await db.query('ROLLBACK');}catch{discard=true;}
      throw new Error(`Closed-application retention failed at ${stage}; review current state before retrying`);
    } finally {db.release(discard);}
  }});
}
