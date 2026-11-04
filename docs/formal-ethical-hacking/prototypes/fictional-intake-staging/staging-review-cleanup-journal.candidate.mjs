// Detached/default-off POSIX journal. Not a live launcher or sender fence.
import {open,lstat,rename,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
const exact=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const fail=()=>Error('Cleanup journal unavailable');
function valid(s,scope){if(!exact(s,'entries,format,revision,scopeId')||s.format!==1||s.scopeId!==scope||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.entries)||s.entries.length>128)throw fail();const seen=new Set();for(const e of s.entries){if(!exact(e,'capabilityRef,cleanupRequested,deadlineMs,deletedEpoch,epoch,key,sender')||!uuid(e.key)||seen.has(e.key)||!uuid(e.capabilityRef)||!stamp(e.deadlineMs)||!['reserved','inflight','unknown','settled'].includes(e.sender)||typeof e.cleanupRequested!=='boolean'||e.epoch!==(e.sender==='settled'?1:0)||(e.deletedEpoch!==null&&e.deletedEpoch!==e.epoch)||(e.deletedEpoch!==null&&!e.cleanupRequested))throw fail();seen.add(e.key);}return s;}
const complete=e=>e.sender==='settled'&&e.cleanupRequested&&e.deletedEpoch===e.epoch;
export async function openReviewCleanupJournal(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({enabled:false,reserve:async()=>null,snapshot:async()=>null,close:async()=>{},get writable(){return false;}});
 const {directory,scopeId,storageAttested,maxEntries=32}=config,{now}=ports;if(storageAttested!==true||!isAbsolute(directory??'')||!uuid(scopeId)||typeof now!=='function'||!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>128)throw fail();
 const ds=await lstat(directory);if(!ds.isDirectory()||ds.isSymbolicLink()||(ds.mode&0o077)!==0||ds.uid!==process.getuid())throw fail();
 const lockPath=join(directory,'.review-cleanup.lock'),path=join(directory,'review-cleanup.json');let lock,state,healthy=true,closing=false,closed,queue=Promise.resolve(),last=-1;
 async function syncDir(){const h=await open(directory,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
 async function persist(next){valid(next,scopeId);const text=JSON.stringify(next);if(Buffer.byteLength(text)>262144)throw fail();const temp=join(directory,`.review-cleanup-${randomUUID()}.tmp`);let h;try{h=await open(temp,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);await h.writeFile(text);await h.sync();await h.close();h=null;await rename(temp,path);await syncDir();}finally{if(h)await h.close();try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}}
 async function unlock(){if(lock){await lock.close();lock=null;await unlink(lockPath);await syncDir();}}
 try{lock=await open(lockPath,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);await lock.writeFile(scopeId);await lock.sync();await syncDir();let h;try{h=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);const st=await h.stat();if(!st.isFile()||(st.mode&0o077)!==0||st.uid!==process.getuid()||st.size>262144)throw fail();state=valid(JSON.parse(await h.readFile('utf8')),scopeId);}catch(e){if(e.code!=='ENOENT')throw e;state={format:1,scopeId,revision:0,entries:[]};await persist(state);}finally{if(h)await h.close();}if(state.entries.length>maxEntries)throw fail();if(state.entries.some(e=>e.sender==='inflight')){const next=structuredClone(state);for(const e of next.entries)if(e.sender==='inflight')e.sender='unknown';next.revision++;await persist(next);state=next;}}catch{healthy=false;try{await unlock();}catch{}throw fail();}
 function clock(){const t=now();if(!stamp(t)||t<last){healthy=false;throw fail();}last=t;return t;}
 function tx(work){if(closing)return Promise.reject(fail());const p=queue.then(async()=>{if(!healthy)throw fail();const at=clock(),next=structuredClone(state),result=work(next,at);if(JSON.stringify(next)!==JSON.stringify(state)){next.revision++;try{await persist(next);}catch{healthy=false;throw fail();}state=next;}return result;});queue=p.catch(()=>{});return p;}
 function entry(s,key){if(!uuid(key))throw fail();const e=s.entries.find(x=>x.key===key);if(!e)throw fail();return e;}
 return Object.freeze({enabled:true,get writable(){return healthy&&!closing;},
 reserve(input){return tx((s,at)=>{if(!exact(input,'capabilityRef,deadlineMs')||!uuid(input.capabilityRef)||!stamp(input.deadlineMs)||input.deadlineMs<=at||input.deadlineMs>at+300000||s.entries.length>=maxEntries||s.entries.some(e=>e.sender==='unknown'))return null;const e={key:randomUUID(),capabilityRef:input.capabilityRef,deadlineMs:input.deadlineMs,sender:'reserved',epoch:0,cleanupRequested:false,deletedEpoch:null};s.entries.push(e);return Object.freeze({key:e.key});});},
 start:key=>tx((s,at)=>{const e=entry(s,key);if(e.sender!=='reserved'||e.cleanupRequested||at>=e.deadlineMs)return false;e.sender='inflight';return true;}),
 markUnknown:key=>tx(s=>{const e=entry(s,key);if(e.sender!=='inflight')return false;e.sender='unknown';return true;}),
 finalize:(key,proof)=>tx(s=>{if(!exact(proof,'quiesced')||proof.quiesced!==true)return false;const e=entry(s,key);if(e.sender==='settled')return false;e.sender='settled';e.epoch=1;e.deletedEpoch=null;return true;}),
 deleteTicket:key=>tx(s=>{const e=entry(s,key);e.cleanupRequested=true;return Object.freeze({key:e.key,epoch:e.epoch,capabilityRef:e.capabilityRef});}),
 confirmDeleted:t=>tx(s=>{if(!exact(t,'deleted,epoch,key')||t.deleted!==true||![0,1].includes(t.epoch))return false;const e=entry(s,t.key);if(!e.cleanupRequested||e.epoch!==t.epoch)return false;e.deletedEpoch=e.epoch;return complete(e);}),
 snapshot:()=>tx(s=>Object.freeze({revision:s.revision,entries:s.entries.map(e=>Object.freeze({...e,complete:complete(e)}))})),
 close(){if(!closed){closing=true;closed=(async()=>{await queue;try{await unlock();}catch{healthy=false;throw fail();}})();}return closed;}
 });
}
