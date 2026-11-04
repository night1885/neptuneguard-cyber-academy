// Detached read-only evidence helper. NEVER an activation or stale-lock removal authority.
import {open,lstat,readdir} from 'node:fs/promises';import {constants} from 'node:fs';import {join,isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
const flags=Object.freeze({mayActivate:false,mayRemoveLease:false,mayDiscardCommand:false,requiresOperatorReview:true});
const denied=reason=>Object.freeze({ok:false,...flags,reason});
const hash=x=>createHash('sha256').update(x).digest('hex'),uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const exact=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===k;
async function readBounded(directory,name,max){const h=await open(join(directory,name),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);try{const s=await h.stat();if(!s.isFile()||s.uid!==process.getuid()||(s.mode&0o077)||s.size<1||s.size>max)throw Error();const buffer=Buffer.alloc(max+1),r=await h.read(buffer,0,max+1,0),after=await h.stat();if(r.bytesRead!==s.size||after.size!==s.size||after.mtimeMs!==s.mtimeMs||after.ctimeMs!==s.ctimeMs)throw Error();const bytes=buffer.subarray(0,r.bytesRead),text=bytes.toString('utf8');if(!Buffer.from(text,'utf8').equals(bytes))throw Error();return text;}finally{await h.close();}}
export async function inspectCustodyRecovery(config={}){
 if(config.enabled!==true)return denied('disabled');
 if(config.operatorQuiescenceAttested!==true)return denied('quiescence-not-attested');
 try{
  const {directory,expectedInstanceId,expectedScopeKey}=config;
  if(config.storageAttested!==true||!isAbsolute(directory??'')||!uuid(expectedInstanceId)||typeof expectedScopeKey!=='string'||!/^[a-f0-9]{64}$/.test(expectedScopeKey)||typeof process.getuid!=='function')return denied('inspection-unavailable');
  const ds=await lstat(directory);if(!ds.isDirectory()||ds.isSymbolicLink()||ds.uid!==process.getuid()||(ds.mode&0o077))return denied('inspection-unavailable');
  async function sample(){const entries=(await readdir(directory)).sort();if(entries.length<2||entries.length>3||!entries.includes('custody-instance.json')||!entries.includes('custody-state.json')||entries.some(n=>!['custody-instance.json','custody-state.json','.custody-store.lock'].includes(n)))throw Error();const marker=await readBounded(directory,'custody-instance.json',4096),journal=await readBounded(directory,'custody-state.json',32768),lease=entries.includes('.custody-store.lock')?await readBounded(directory,'.custody-store.lock',4096):null;return {entries,marker,journal,lease};}
  const first=await sample(),second=await sample();if(JSON.stringify(first)!==JSON.stringify(second))return denied('snapshot-changed');
  const m=JSON.parse(first.marker),j=JSON.parse(first.journal);
  if(!exact(m,'format,instanceId,phase,scopeKey')||m.format!==1||m.phase!=='ready'||m.instanceId!==expectedInstanceId||m.scopeKey!==expectedScopeKey||!exact(j,'format,instanceId,payload,scopeKey,sequence,sha256')||j.format!==1||j.instanceId!==m.instanceId||j.scopeKey!==m.scopeKey||typeof j.payload!=='string'||Buffer.byteLength(j.payload)>16384||j.sha256!==hash(j.payload))return denied('inspection-unavailable');
  const {inspectState}=await import('./custody-state.mjs');const s=inspectState(JSON.parse(j.payload));if(s.sequence!==j.sequence||hash(JSON.stringify(s.scope))!==expectedScopeKey)return denied('inspection-unavailable');
  const reasons={idle:'idle-is-not-activation-proof',prepared:'prepared-needs-reviewed-reconciliation',pending:'pending-dispatch-unresolved',uncertain:'original-outcome-unresolved',resolved:'stored-receipt-not-current-authorization'};
  return Object.freeze({ok:true,...flags,phase:s.phase,sequence:s.sequence,leasePresent:first.lease!==null,retainedCommand:s.command!==null,retainedReceipt:s.receipt!==null,reason:reasons[s.phase]});
 }catch{return denied('inspection-unavailable');}
}
