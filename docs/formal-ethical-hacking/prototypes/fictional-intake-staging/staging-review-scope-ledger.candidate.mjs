// Detached/default-off ownership metadata. Not a public API or authorization service.
import {open,lstat,rename,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
const keys=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const rev=x=>Number.isInteger(x)&&x>=0&&x<2147483647;
const fail=()=>Error('Scope ownership unavailable');
const copy=x=>x&&typeof x==='object'?Object.freeze({...x}):x;
function request(r){return keys(r,'decision,expectedReviewRevision,expiresAtMs,reportId,requestId,submissionRevision,until')&&uuid(r.requestId)&&uuid(r.reportId)&&['changes-requested','review-recorded'].includes(r.decision)&&rev(r.expectedReviewRevision)&&rev(r.submissionRevision)&&r.submissionRevision>0&&stamp(r.expiresAtMs)&&stamp(r.until)&&r.until<=r.expiresAtMs;}
export async function openReviewScopeLedger(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({canBegin:()=>false,claim:async()=>null,prepare:async()=>false,startWrite:async()=>false,markUncertain:async()=>false,complete:async()=>false,abandon:async()=>false,snapshot:async()=>null,close:async()=>{}});
 const c=Object.freeze({...config}),{now,isReady}=ports;
 if(c.storageAttested!==true||!isAbsolute(c.directory??'')||!snow(c.guildId)||!snow(c.reviewerId)||!uuid(c.recordId)||![now,isReady].every(f=>typeof f==='function'))throw fail();
 const expected={guildId:c.guildId,recordId:c.recordId,reviewerId:c.reviewerId};
 const ds=await lstat(c.directory);if(!ds.isDirectory()||ds.isSymbolicLink()||(ds.mode&0o077)||ds.uid!==process.getuid())throw fail();
 const path=join(c.directory,'review-scope.json'),lockPath=join(c.directory,'.review-scope.lock');let lock,state,closed=false,healthy=true,last=-1,queued=0,queue=Promise.resolve(),closing;
 const ctx=x=>keys(x,'actorId,guildId')&&x.actorId===c.reviewerId&&x.guildId===c.guildId;
 function ready(){try{const v=isReady();v?.catch?.(()=>{});return !closed&&healthy&&v===true;}catch{return false;}}
 function valid(s){if(!keys(s,'format,outcome,ownerId,phase,request,scope')||s.format!==1||!keys(s.scope,'guildId,recordId,reviewerId')||Object.keys(expected).some(k=>s.scope[k]!==expected[k])||!['idle','held','pending','uncertain','resolved'].includes(s.phase))throw fail();if(s.phase==='idle'){if(s.ownerId!==null||s.request!==null||s.outcome!==null)throw fail();}else{if(!uuid(s.ownerId)||s.request!==null&&!request(s.request)||s.phase!=='held'&&s.request===null||(s.phase==='resolved'?s.outcome!=='committed':s.outcome!==null))throw fail();}return s;}
 async function syncDir(){const h=await open(c.directory,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
 async function persist(next){valid(next);const text=JSON.stringify(next);if(Buffer.byteLength(text)>8192)throw fail();const temp=join(c.directory,'.review-scope-'+randomUUID()+'.tmp');let h;try{h=await open(temp,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);await h.writeFile(text);await h.sync();await h.close();h=null;await rename(temp,path);await syncDir();}finally{if(h)await h.close();try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}}
 async function unlock(){if(lock){await lock.close();lock=null;await unlink(lockPath);await syncDir();}}
 try{lock=await open(lockPath,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);await lock.writeFile(c.recordId);await lock.sync();await syncDir();let h;try{h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const st=await h.stat();if(!st.isFile()||st.uid!==process.getuid()||(st.mode&0o077)||st.size>8192)throw fail();state=valid(JSON.parse(await h.readFile('utf8')));}catch(e){if(e.code!=='ENOENT')throw e;state={format:1,scope:expected,phase:'idle',ownerId:null,request:null,outcome:null};await persist(state);}finally{if(h)await h.close();}if(state.phase==='pending'){const s={...state,phase:'uncertain'};await persist(s);state=s;}}catch{try{await unlock();}catch{}throw fail();}
 function clock(){const t=now();if(!stamp(t)||t<last){healthy=false;throw fail();}last=t;return t;}
 function tx(work){if(closed)return Promise.reject(fail());queued++;const p=queue.then(async()=>{if(!healthy)throw fail();const at=clock(),next=structuredClone(state),result=work(next,at);if(JSON.stringify(next)!==JSON.stringify(state)){try{await persist(next);}catch{healthy=false;throw fail();}state=next;}return result;}).finally(()=>{queued--;});queue=p.catch(()=>{});return p;}
 const owned=(s,input,owner)=>ctx(input)&&uuid(owner)&&s.ownerId===owner;
 return Object.freeze({
  canBegin(input){try{return !!(ctx(input)&&queued===0&&ready()&&clock()>=0&&['idle','resolved'].includes(state.phase));}catch{return false;}},
  claim(input){input=copy(input);return tx(s=>{if(!ctx(input)||!ready()||!['idle','resolved'].includes(s.phase))return null;s.phase='held';s.ownerId=randomUUID();s.request=null;s.outcome=null;return Object.freeze({ownerId:s.ownerId});});},
  prepare(input,owner,r){input=copy(input);r=copy(r);return tx((s,at)=>{if(!owned(s,input,owner)||!ready()||s.phase!=='held'||s.request!==null||!request(r)||r.until<=at||r.until>at+300000)return false;s.request={...r};return true;});},
  startWrite(input,owner,id,mode){input=copy(input);return tx((s,at)=>{if(!owned(s,input,owner)||!ready()||!s.request||s.request.requestId!==id||at>=s.request.until||!(mode==='confirm'&&s.phase==='held'||mode==='recover'&&s.phase==='uncertain'))return false;s.phase='pending';return true;});},
  markUncertain(input,owner,id){input=copy(input);return tx(s=>{if(!owned(s,input,owner)||!s.request||s.request.requestId!==id||!['pending','uncertain'].includes(s.phase))return false;s.phase='uncertain';return true;});},
  complete(input,owner,receipt){input=copy(input);receipt=copy(receipt);return tx(s=>{const r=s.request;if(!owned(s,input,owner)||!r||!['pending','uncertain'].includes(s.phase)||!keys(receipt,'expiresAtMs,ok,recordId,reportId,requestId,reviewRevision,status,submissionRevision')||receipt.ok!==true||receipt.recordId!==c.recordId||receipt.reportId!==r.reportId||receipt.requestId!==r.requestId||receipt.reviewRevision!==r.expectedReviewRevision+1||receipt.submissionRevision!==r.submissionRevision||receipt.expiresAtMs!==r.expiresAtMs||receipt.status!==r.decision)return false;s.phase='resolved';s.outcome='committed';return true;});},
  abandon(input,owner){input=copy(input);return tx(s=>{if(!owned(s,input,owner)||s.phase!=='held')return false;s.phase='idle';s.ownerId=null;s.request=null;s.outcome=null;return true;});},
  snapshot:()=>tx(s=>Object.freeze(structuredClone(s))),
  close(){if(!closing){closed=true;closing=(async()=>{await queue;await unlock();})();}return closing;}
 });
}
