import { readFile } from 'node:fs/promises';

export function parseManualReviewConstraint(value) {
  if(typeof value!=='string'||value.length>20000)throw new Error('Invalid constraint');
  const tokens=value.match(/'(?:''|[^'])*'|->>|::|>=|<=|<>|[A-Za-z_][A-Za-z0-9_]*|[0-9]+|\S/g);let at=0;
  if(!tokens||tokens.length>2048||tokens[at++]!=='CHECK')throw new Error('Invalid constraint');
  const take=t=>tokens[at]===t?(at++,true):false;
  const need=t=>{if(!take(t))throw new Error('Invalid constraint');};
  const group=(op,a,b)=>[op,...(a[0]===op?a.slice(1):[a]),...(b[0]===op?b.slice(1):[b])];
  function primary(){
    let node;
    if(take('(')){node=expression(0);need(')');}
    else{
      let token=tokens[at++];
      if(/^'(?:''|[^'])*'$/.test(token||''))node=['literal',token.slice(1,-1).replaceAll("''", "'")];
      else if(/^[0-9]+$/.test(token||''))node=['number',Number(token)];
      else{
        if(!/^[a-z_][a-z0-9_]*$/.test(token||''))throw new Error('Invalid constraint');
        let qualifier=null;if(take('.')){qualifier=token;token=tokens[at++];}
        if(take('(')){
          if(!['char_length','certification_valid_manual_review_snapshot'].includes(token)||
            (qualifier!==null&&qualifier!==(token==='char_length'?'pg_catalog':'public')))throw new Error('Invalid function');
          const args=[expression(0)];while(take(','))args.push(expression(0));need(')');node=['call',token,...args];
        }else{if(qualifier!==null)throw new Error('Invalid field');node=['field',token];}
      }
    }
    while(take('::')){need('text');if(node[0]!=='literal'&&!(node[0]==='field'&&['discord_user_id','signature_method','agreement_version','agreement_content_sha256','comprehension_check_version','age_declaration_version','status'].includes(node[1])))throw new Error('Invalid cast');}
    return node;
  }
  function expression(min){
    let lhs=primary();
    while(at<tokens.length){
      const op=tokens[at],level=op==='OR'?10:op==='AND'?20:['IS','BETWEEN','=','~','>','<','>=','<=','<>'].includes(op)?30:op==='->>'?40:0;
      if(!level||level<min)break;at++;
      if(op==='IS'){
        if(take('DISTINCT')){need('FROM');lhs=['is-distinct',lhs,expression(31)];}
        else{const not=take('NOT'),kind=tokens[at++];if(!['NULL','TRUE'].includes(kind))throw new Error('Invalid predicate');lhs=[`is-${not?'not-':''}${kind.toLowerCase()}`,lhs];}
      }else if(op==='BETWEEN'){
        const lower=expression(31);need('AND');const upper=expression(31);lhs=group('AND',['>=',lhs,lower],['<=',lhs,upper]);
      }else{const rhs=expression(level+1);lhs=['AND','OR'].includes(op)?group(op,lhs,rhs):[op,lhs,rhs];}
    }
    return lhs;
  }
  const parsed=expression(0);if(at!==tokens.length)throw new Error('Invalid constraint');return parsed;
}
function definition(sql,name){
  const marker=`ADD CONSTRAINT ${name} CHECK (`;const offset=sql.indexOf(marker);
  if(offset<0)throw new Error('Missing reviewed constraint');
  const start=offset+`ADD CONSTRAINT ${name} `.length;let depth=0,quoted=false;
  for(let i=start;i<sql.length;i++){
    const c=sql[i];if(c==="'"){if(quoted&&sql[i+1]==="'"){i++;continue;}quoted=!quoted;}
    if(!quoted){if(c==='(')depth++;if(c===')'&&--depth===0)return sql.slice(start,i+1);}
  }
  throw new Error('Invalid reviewed constraint');
}
export const manualReviewReadinessSql=`SELECT
  current_user=session_user AND pg_catalog.current_setting('session_replication_role')='origin'
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r WHERE pg_catalog.pg_has_role(current_user,r.oid,'MEMBER')
      AND (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)) AS restricted_role,
  c.relkind='r' AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity AND NOT c.relispartition
    AND pg_catalog.to_regclass('certification_enrollments')=c.oid
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid=c.oid OR inhparent=c.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite WHERE ev_class=c.oid) AS table_shape,
  NOT pg_catalog.pg_has_role(current_user,c.relowner,'MEMBER')
    AND pg_catalog.has_schema_privilege(current_user,n.oid,'USAGE')
    AND NOT pg_catalog.has_schema_privilege(current_user,n.oid,'CREATE') AS owner_limits,
  (SELECT pg_catalog.count(*)=2 AND pg_catalog.bool_and(NOT a.attnotnull AND NOT a.atthasdef AND a.attgenerated='' AND a.attidentity=''
      AND a.atttypid=CASE a.attname WHEN 'comprehension_submitted_at' THEN 'pg_catalog.timestamptz'::pg_catalog.regtype ELSE 'pg_catalog.jsonb'::pg_catalog.regtype END)
    FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
      AND a.attname IN ('comprehension_submitted_at','comprehension_review_snapshot')) AS columns_ok,
  NOT EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['comprehension_submitted_at','comprehension_review_snapshot']) x(name)
    WHERE NOT pg_catalog.has_column_privilege(current_user,c.oid,x.name,'SELECT')
      OR NOT pg_catalog.has_column_privilege(current_user,c.oid,x.name,'UPDATE')
      OR pg_catalog.has_column_privilege(current_user,c.oid,x.name,'INSERT'))
    AND NOT pg_catalog.has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,TRIGGER') AS column_privileges,
  k.contype='c' AND k.convalidated AND k.conislocal AND k.coninhcount=0
    AND a.contype='c' AND a.convalidated AND a.conislocal AND a.coninhcount=0 AS constraints_ok,
  EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_constraint'::pg_catalog.regclass AND d.objid=k.oid
    AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid=p.oid)
    AND EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_constraint'::pg_catalog.regclass AND d.objid=a.oid
    AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid=p.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_depend d
      LEFT JOIN pg_catalog.pg_proc f ON d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND f.oid=d.refobjid
      LEFT JOIN pg_catalog.pg_operator o ON d.refclassid='pg_catalog.pg_operator'::pg_catalog.regclass AND o.oid=d.refobjid
      WHERE d.classid='pg_catalog.pg_constraint'::pg_catalog.regclass AND d.objid IN (k.oid,a.oid)
        AND ((f.oid IS NOT NULL AND f.oid<>p.oid AND f.pronamespace<>'pg_catalog'::pg_catalog.regnamespace)
          OR (o.oid IS NOT NULL AND o.oprnamespace<>'pg_catalog'::pg_catalog.regnamespace))) AS function_dependencies,
  p.proowner=c.relowner AND p.pronamespace=c.relnamespace AND p.prokind='f' AND NOT p.prosecdef AND NOT p.proretset
    AND p.pronargs=1 AND p.pronargdefaults=0 AND p.proargtypes='3802'::pg_catalog.oidvector
    AND p.prorettype='pg_catalog.bool'::pg_catalog.regtype AND p.provolatile='i' AND p.proparallel='s'
    AND p.prolang=(SELECT oid FROM pg_catalog.pg_language WHERE lanname='sql') AND p.prosqlbody IS NULL
    AND pg_catalog.has_function_privilege(current_user,p.oid,'EXECUTE') AS function_shape,
  pg_catalog.pg_get_constraintdef(k.oid,true) AS snapshot_constraint,
  pg_catalog.pg_get_constraintdef(a.oid,true) AS acknowledgment_constraint,
  p.prosrc AS function_body,p.proconfig AS function_settings
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  LEFT JOIN pg_catalog.pg_constraint k ON k.conrelid=c.oid AND k.conname='certification_manual_review_snapshot_complete'
  LEFT JOIN pg_catalog.pg_constraint a ON a.conrelid=c.oid AND a.conname='certification_account_acknowledgment_required'
  LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure('public.certification_valid_manual_review_snapshot(jsonb)')
  WHERE n.nspname='public' AND c.relname='certification_enrollments'`;
const flags=['restricted_role','table_shape','owner_limits','columns_ok','column_privileges','constraints_ok','function_dependencies','function_shape'];
export async function validateManualReviewReadiness(pool){
  try{
    const sql=await readFile(new URL('./migrations/010-manual-review-enrollment.sql',import.meta.url),'utf8');
    if(sql.length>30000)throw new Error();
    const body=/AS \$function\$([\s\S]*?)\$function\$/.exec(sql)?.[1];
    if(typeof body!=='string'||!body.length)throw new Error();
    const expected=[definition(sql,'certification_manual_review_snapshot_complete'),definition(sql,'certification_account_acknowledgment_required')].map(parseManualReviewConstraint);
    const rows=(await pool.query(manualReviewReadinessSql)).rows;
    if(!Array.isArray(rows)||rows.length!==1)throw new Error();const row=rows[0];
    if(flags.some(key=>row[key]!==true)||row.function_body!==body||
      !Array.isArray(row.function_settings)||row.function_settings.length!==1||row.function_settings[0]!=='search_path=pg_catalog')throw new Error();
    const actual=[row.snapshot_constraint,row.acknowledgment_constraint].map(parseManualReviewConstraint);
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error();
    return Object.freeze({ready:true});
  }catch{throw new Error('Manual-review readiness failed; reviewed migration 010 and restricted-role safeguards required');}
}
