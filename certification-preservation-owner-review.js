const id=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const ident=v=>typeof v==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const date=v=>v instanceof Date&&Number.isFinite(v.getTime())&&v.getUTCFullYear()>=1970&&v.getUTCFullYear()<=9998;
const reference=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
const blocked=Object.freeze({decision:'hold'});
function utc(value,micro=false){
  if(typeof value!=='string'||!(micro?/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/).test(value))return false;
  const base=micro?value.slice(0,23)+'Z':value,parsed=new Date(base);return date(parsed)&&parsed.toISOString()===base;
}
function binding(c){
  if(c.category==='closed_application'&&id(c.subjectId)&&utc(c.closedAt))return{category:c.category,subjectId:c.subjectId,closedAt:c.closedAt};
  if(c.category==='audit_event'&&typeof c.eventId==='string'&&/^[1-9][0-9]{0,18}$/.test(c.eventId)&&BigInt(c.eventId)<=9223372036854775807n&&utc(c.occurredAt,true))return{category:c.category,eventId:c.eventId,occurredAt:c.occurredAt};
  if(c.category==='completed_shared_enrollment'&&id(c.subjectId)&&hash(c.snapshotSha256)&&Array.isArray(c.courseKeys)&&c.courseKeys.length>0&&c.courseKeys.length<=50&&new Set(c.courseKeys).size===c.courseKeys.length&&c.courseKeys.every(k=>typeof k==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(k)))return{category:c.category,subjectId:c.subjectId,snapshotSha256:c.snapshotSha256,courseKeys:Object.freeze([...c.courseKeys])};
  return null;
}
// Staged read adapter only. readClearance must use trusted server-owned state, NEVER interaction JSON.
export function createOwnerPreservationReview(config={}, {readClearance,now=()=>new Date()}={}){
  const {ownerId,guildId,database,schema,enabled=false,lookupTimeoutMs=500}=config;
  if(!id(ownerId)||!id(guildId)||!ident(database)||!ident(schema)||typeof readClearance!=='function'||typeof now!=='function'||!Number.isSafeInteger(lookupTimeoutMs)||lookupTimeoutMs<1||lookupTimeoutMs>1000)throw new Error('Explicit owner review scope and trusted lookup required');
  return async function reviewPreservation(context){
    if(enabled!==true||context?.actorId!==ownerId||!(context.signal instanceof AbortSignal)||context.signal.aborted)return blocked;
    const evidence=binding(context);if(!evidence)return blocked;
    const scope={policyVersion:'owner-preservation-v1',guildId,database,schema,actorId:ownerId,...evidence};
    const signal=context.signal,controller=new AbortController();let timer,rejectAbort;
    const aborted=new Promise((resolve,reject)=>{rejectAbort=reject;});
    const onAbort=()=>{controller.abort();rejectAbort(new Error());};signal.addEventListener('abort',onAbort,{once:true});
    try{
      const request=Object.freeze({...scope,signal:controller.signal});
      const row=await Promise.race([Promise.resolve().then(()=>readClearance(request)),aborted,new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error()),lookupTimeoutMs);})]);
      const checkedAt=now();
      if(signal.aborted||!date(checkedAt)||!row||row.decision!=='allow'||row.reviewerId!==ownerId||row.reviewComplete!==true||row.uncertain!==false||row.preservationRequired!==false||row.revoked!==false||!reference(row.reference)||!date(row.reviewedAt)||!date(row.expiresAt)||row.reviewedAt>checkedAt||row.expiresAt<=checkedAt||row.expiresAt-row.reviewedAt>300000)return blocked;
      for(const [key,value]of Object.entries(scope)){
        if(key==='courseKeys'){if(!Array.isArray(row[key])||row[key].length!==value.length||value.some((k,i)=>row[key][i]!==k))return blocked;}
        else if(row[key]!==value)return blocked;
      }
      return Object.freeze({...scope,decision:'allow',reference:row.reference,reviewedAt:new Date(row.reviewedAt),expiresAt:new Date(row.expiresAt)});
    }catch{return blocked;}
    finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort);controller.abort();}
  };
}
