import { classifyAuditRetention } from './certification-audit-retention-preview.js';
const id=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const ident=v=>typeof v==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(v);
const eventId=v=>typeof v==='string'&&/^[1-9][0-9]{0,18}$/.test(v)&&BigInt(v)<=9223372036854775807n;
const date=v=>v instanceof Date&&Number.isFinite(v.getTime());
const reference=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
// Staged library only. Default cutoff pads milliseconds with zeros: conservative, not rounded forward.
export function createAuditRetentionExecutor(pool,config={}, {reviewPreservation,now=()=>new Date(),cutoffUtc=()=>new Date().toISOString().replace('Z','000Z')}={}){
  const {ownerId,executorRole,expectedDatabase,schema,enabled=false}=config;
  if(!id(ownerId)||!ident(executorRole)||!ident(expectedDatabase)||!ident(schema)||executorRole==='neptuneguard_certification_app'||
    typeof reviewPreservation!=='function'||typeof now!=='function'||typeof cutoffUtc!=='function')throw new Error('Explicit audit retention configuration and review provider required');
  const table=`"${schema}"."certification_audit_events"`;
  const others=['certification_enrollments','certification_course_enrollments','certification_lab_requests'].map(n=>`"${schema}"."${n}"`);
  return Object.freeze({async execute(actorId,targetId){
    if(enabled!==true||actorId!==ownerId||!eventId(targetId))throw new Error('Audit retention execution not authorized');
    let db;try{db=await pool.connect();}catch{throw new Error('Audit retention connection unavailable');}
    let discard=false,stage='transaction';const started=performance.now();
    const query=(...args)=>{if(performance.now()-started>15000)throw new Error();return db.query(...args);};
    try{
      await query('BEGIN');await query("SET LOCAL lock_timeout='2s'");await query("SET LOCAL statement_timeout='5s'");
      await query("SET LOCAL idle_in_transaction_session_timeout='10s'");await query('SET LOCAL search_path=pg_catalog');
      stage='identity';
      const identity=(await query(`SELECT current_database() AS database,current_user AS role,session_user AS session_role,
        current_setting('session_replication_role')='origin' AS origin,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_has_role(current_user,r.oid,'MEMBER') AND
          (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted`)).rows[0];
      if(identity?.database!==expectedDatabase||identity.role!==executorRole||identity.session_role!==executorRole||identity.origin!==true||identity.restricted!==true)throw new Error();
      stage='privileges';
      const p=(await query(`SELECT c.relkind='r' AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity AS ordinary_table,
        NOT pg_has_role(current_user,c.relowner,'MEMBER') AS non_owner,
        has_schema_privilege(current_user,$2,'USAGE') AND NOT has_schema_privilege(current_user,$2,'CREATE') AS schema_access,
        has_table_privilege(current_user,c.oid,'DELETE') AS can_delete,
        has_column_privilege(current_user,c.oid,'event_id','SELECT') AND has_column_privilege(current_user,c.oid,'created_at','SELECT') AS can_read,
        NOT has_any_column_privilege(current_user,c.oid,'INSERT') AND NOT has_any_column_privilege(current_user,c.oid,'UPDATE')
          AND NOT has_table_privilege(current_user,c.oid,'TRUNCATE,TRIGGER') AS audit_limits,
        NOT EXISTS(SELECT 1 FROM unnest($3::text[]) AS names(name) WHERE
          has_table_privilege(current_user,to_regclass(name),'DELETE,TRUNCATE,TRIGGER') OR
          has_any_column_privilege(current_user,to_regclass(name),'INSERT') OR has_any_column_privilege(current_user,to_regclass(name),'UPDATE')) AS other_limits
        FROM pg_catalog.pg_class c WHERE c.oid=to_regclass($1)`,[table,schema,others])).rows[0];
      if(!p||['ordinary_table','non_owner','schema_access','can_delete','can_read','audit_limits','other_limits'].some(k=>p[k]!==true))throw new Error();
      stage='dependencies';
      await query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
      const shape=(await query(`SELECT
        EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=to_regclass($1) AND attname='event_id' AND attnum>0 AND NOT attisdropped AND atttypid='pg_catalog.int8'::regtype AND attnotnull) AS bigint_id,
        EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=to_regclass($1) AND attname='created_at' AND attnum>0 AND NOT attisdropped AND atttypid='pg_catalog.timestamptz'::regtype AND attnotnull) AS timestamp_column,
        EXISTS(SELECT 1 FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attnum=ANY(k.conkey)
          WHERE k.conrelid=to_regclass($1) AND k.contype='p' AND k.convalidated AND cardinality(k.conkey)=1 AND a.attname='event_id') AS primary_key,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE contype='f' AND confrelid=to_regclass($1)) AS no_inbound_fk,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass($1) AND NOT tgisinternal AND (tgtype & 8)=8) AS no_delete_trigger,
        NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=to_regclass($1)) AS no_rules`,[table])).rows[0];
      if(!shape||['bigint_id','timestamp_column','primary_key','no_inbound_fk','no_delete_trigger','no_rules'].some(k=>shape[k]!==true))throw new Error();
      stage='eligibility';
      const rows=(await query(`SELECT event_id::text AS event_id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS occurred_at_utc FROM ${table} WHERE event_id=$1::bigint`,[targetId])).rows;
      if(!rows.length){await query('COMMIT');return Object.freeze({outcome:'not_found',deleted:0});}
      if(rows.length!==1||rows[0].event_id!==targetId)throw new Error();
      const row=rows[0];
      if(classifyAuditRetention(row,cutoffUtc()).disposition!=='timing_candidate')throw new Error();
      stage='preservation';let decision,timer;const controller=new AbortController();
      try{decision=await Promise.race([
        Promise.resolve().then(()=>reviewPreservation(Object.freeze({actorId,eventId:targetId,category:'audit_event',occurredAt:row.occurred_at_utc,signal:controller.signal}))),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error()),1000);})
      ]);}finally{clearTimeout(timer);controller.abort();}
      const checkedAt=now();
      if(!date(checkedAt)||decision?.decision!=='allow'||decision.actorId!==actorId||decision.eventId!==targetId||decision.category!=='audit_event'||
        decision.occurredAt!==row.occurred_at_utc||!reference(decision.reference)||!date(decision.reviewedAt)||!date(decision.expiresAt)||
        decision.reviewedAt>checkedAt||decision.expiresAt<=checkedAt||decision.expiresAt-decision.reviewedAt>300000)throw new Error();
      const cutoff=cutoffUtc();if(classifyAuditRetention(row,cutoff).disposition!=='timing_candidate')throw new Error();
      stage='deletion';
      const removed=await query(`DELETE FROM ${table} WHERE event_id=$1::bigint AND created_at=$2::timestamptz
        AND (created_at AT TIME ZONE 'UTC')+INTERVAL '3 months'<=($3::timestamptz AT TIME ZONE 'UTC') RETURNING event_id::text AS event_id`,[targetId,row.occurred_at_utc,cutoff]);
      if(removed.rowCount!==1||removed.rows.length!==1||removed.rows[0].event_id!==targetId)throw new Error();
      stage='commit';await query('COMMIT');return Object.freeze({outcome:'deleted',deleted:1,eventId:targetId,preservationReference:decision.reference});
    }catch{try{await db.query('ROLLBACK');}catch{discard=true;}throw new Error(`Audit retention failed at ${stage}; review current state before retrying`);}
    finally{db.release(discard);}
  }});
}
