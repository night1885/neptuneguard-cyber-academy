import { validateCertificationSchema as validateBaseCertificationSchema } from './certification-schema-readiness.js';
import { validateProvenanceSubmissionReadiness } from './certification-provenance-submission-readiness.js';
const tables=Object.freeze(['certification_enrollments','certification_agreements','certification_audit_events','certification_lab_requests','certification_course_enrollments']);
function readPilotDatabaseTarget(connection){
  try{
    const url=new URL(connection?.connectionString);
    if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.search||url.hash)throw new Error();
    const result={schema:'public',expectedRole:decodeURIComponent(url.username),expectedDatabase:decodeURIComponent(url.pathname.slice(1))};
    if([result.expectedRole,result.expectedDatabase].some(v=>!/^[a-z_][a-z0-9_]{0,62}$/.test(v)))throw new Error();
    return Object.freeze(result);
  }catch{throw new Error('Explicit pilot database login and supported public-schema target required');}
}
const pilotRelationBindingSql=`SELECT pg_catalog.to_regclass(name)=pg_catalog.to_regclass(pg_catalog.format('%I.%I',$1::pg_catalog.text,name)) AS bound FROM pg_catalog.unnest($2::pg_catalog.text[]) AS names(name)`;
async function validatePilotRelationBindings(pool,target){
  if(target?.schema!=='public')throw new Error('Pilot runtime requires reviewed public-schema bindings');
  try{
    const result=await pool.query(pilotRelationBindingSql,[target.schema,tables]);
    if(!Array.isArray(result.rows)||result.rows.length!==tables.length||result.rows.some(row=>row.bound!==true))throw new Error();
    return Object.freeze({ready:true});
  }catch{throw new Error('Pilot relation bindings are missing or shadowed; review the database search path');}
}

export async function validateRuntimeCertificationSchema(pool,{pilotConnection}={}){
  if(pilotConnection===undefined)return validateBaseCertificationSchema(pool);
  try{
    const target=readPilotDatabaseTarget(pilotConnection);
    await validatePilotRelationBindings(pool,target);
    await validateBaseCertificationSchema(pool);
    await validateProvenanceSubmissionReadiness(pool,target);
  }catch{throw new Error('Pilot runtime readiness failed; review public relation bindings and combined safeguards');}
}
