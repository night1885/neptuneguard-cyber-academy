import {randomUUID} from 'node:crypto';
import {buildSharedCompletionSnapshot} from './certification-retention-shared-snapshot.js';
const id=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const ident=v=>typeof v==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(v);
const date=v=>v instanceof Date&&Number.isFinite(v.getTime())&&v.getUTCFullYear()>=1970&&v.getUTCFullYear()<=9998;
const token=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const failure=()=>new Error('Owner review session unavailable; restart review');
// Server-side intent sessions only: no clearance issuance, persistence, Discord binding or deletion.
export function createOwnerSharedReviewSessions(config={}, {readCompletionState,now=()=>new Date()}={}){
  const {ownerId,guildId,database,schema,enabled=false,ttlMs=300000,maxPending=64,readTimeoutMs=500}=config;
  if(!id(ownerId)||!id(guildId)||!ident(database)||!ident(schema)||typeof readCompletionState!=='function'||typeof now!=='function'||!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>300000||!Number.isSafeInteger(maxPending)||maxPending<1||maxPending>100||!Number.isSafeInteger(readTimeoutMs)||readTimeoutMs<1||readTimeoutMs>1000)throw new Error('Explicit owner session scope and trusted state reader required');
  const pending=new Map();
  function clock(){const time=now();if(!date(time))throw failure();return new Date(time);}
  function admit(actorId,serverId){if(enabled!==true||actorId!==ownerId||serverId!==guildId)throw failure();}
  function prune(time){for(const [key,value]of pending)if(value.expiresAt<=time.getTime())pending.delete(key);}
  async function read(subjectId){
    const controller=new AbortController();let timer;
    try{
      const state=await Promise.race([Promise.resolve().then(()=>readCompletionState(Object.freeze({actorId:ownerId,guildId,database,schema,subjectId,signal:controller.signal}))),new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(failure()),readTimeoutMs);})]);
      if(state?.preservationRequired!==false||state.uncertain!==false)throw failure();
      return buildSharedCompletionSnapshot({...state,database,schema,subjectId,asOf:clock()});
    }catch{throw failure();}finally{clearTimeout(timer);controller.abort();}
  }
  return Object.freeze({
    async begin(actorId,serverId,subjectId){
      admit(actorId,serverId);if(!id(subjectId))throw failure();const time=clock();prune(time);
      if(pending.size>=maxPending)throw failure();
      const reference=randomUUID(),record={expiresAt:time.getTime()+ttlMs,subjectId};pending.set(reference,record);
      try{
        const snapshot=await read(subjectId);
        if(pending.get(reference)!==record||record.expiresAt<=clock().getTime())throw failure();
        record.snapshot=snapshot;
        return Object.freeze({outcome:'review_pending',reference,guildId,database,schema,...snapshot,expiresAt:new Date(record.expiresAt)});
      }catch{pending.delete(reference);throw failure();}
    },
    async confirm(actorId,serverId,reference,attestation){
      admit(actorId,serverId);if(!token(reference))throw failure();
      const record=pending.get(reference);pending.delete(reference);
      if(!record?.snapshot||record.expiresAt<=clock().getTime()||attestation!=='reviewed-no-preservation-required')throw failure();
      const current=await read(record.subjectId),confirmedAt=clock();
      if(current.snapshotSha256!==record.snapshot.snapshotSha256||record.expiresAt<=confirmedAt.getTime())throw failure();
      return Object.freeze({outcome:'owner_review_intent',reference,ownerId,guildId,database,schema,...current,confirmedAt,clearanceIssued:false});
    },
    cancel(actorId,serverId,reference){
      admit(actorId,serverId);if(!token(reference))throw failure();const record=pending.get(reference);pending.delete(reference);
      if(!record?.snapshot||record.expiresAt<=clock().getTime())throw failure();
      return Object.freeze({outcome:'canceled',clearanceIssued:false,executionAuthorized:false});
    }
  });
}
