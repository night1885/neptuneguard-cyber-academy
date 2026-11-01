// Detached local POSIX candidate. No launcher imports or live storage configuration.
import {open,lstat,readdir,link,unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const fail=()=>Error('Capability storage unavailable');
const rejected=()=>Object.assign(fail(),{safe:true});
function sealed(r,ref){
 const exact=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
 const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
 const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
 const encoded=(x,n)=>typeof x==='string'&&x.length<=6000&&Buffer.from(x,'base64').toString('base64')===x&&(n===undefined||Buffer.from(x,'base64').length===n);
 if(!exact(r,'ciphertext,cleanupUntilMs,context,deadlineMs,iv,keyId,ref,scopeId,tag,v')||r.v!==1||r.ref!==ref||!uuid(r.scopeId)||typeof r.keyId!=='string'||!/^[a-zA-Z0-9_-]{1,32}$/.test(r.keyId)||!stamp(r.deadlineMs)||!stamp(r.cleanupUntilMs)||!exact(r.context,'actorId,applicationId,channelId,createdTimestamp,guildId,interactionId')||!['actorId','applicationId','channelId','guildId','interactionId'].every(k=>snow(r.context[k]))||!stamp(r.context.createdTimestamp)||!encoded(r.iv,12)||!encoded(r.tag,16)||!encoded(r.ciphertext)||Buffer.from(r.ciphertext,'base64').length<20||Buffer.from(r.ciphertext,'base64').length>4096)throw rejected();return r;
}
export async function openEncryptedCapabilityStore(config={}){
 if(config.enabled!==true)return Object.freeze({put:async()=>{throw fail();},get:async()=>{throw fail();},remove:async()=>false,list:async()=>[],close:async()=>{}});
 const {directory,storageAttested,maxRecords=32}=config;
 if(!isAbsolute(directory??'')||storageAttested!==true||!Number.isInteger(maxRecords)||maxRecords<1||maxRecords>128)throw fail();
 const ds=await lstat(directory);if(!ds.isDirectory()||ds.isSymbolicLink()||(ds.mode&0o077)||ds.uid!==process.getuid())throw fail();
 const lockPath=join(directory,'.capability-vault.lock');let lock,closed=false,healthy=true,queue=Promise.resolve(),closing;const refs=new Set();
 async function syncDir(){const h=await open(directory,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{await h.sync();}finally{await h.close();}}
 async function read(ref){if(!uuid(ref))throw fail();let h;try{h=await open(join(directory,ref+'.json'),constants.O_RDONLY|constants.O_NOFOLLOW);const s=await h.stat();if(!s.isFile()||s.uid!==process.getuid()||(s.mode&0o077)||s.size>16384)throw fail();return sealed(JSON.parse(await h.readFile('utf8')),ref);}finally{if(h)await h.close();}}
 async function unlock(){if(lock){await lock.close();lock=null;await unlink(lockPath);await syncDir();}}
 try{lock=await open(lockPath,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);await lock.writeFile('exclusive capability owner');await lock.sync();await syncDir();for(const name of await readdir(directory)){if(name==='.capability-vault.lock')continue;if(!name.endsWith('.json')||!uuid(name.slice(0,-5)))throw fail();refs.add(name.slice(0,-5));}if(refs.size>maxRecords)throw fail();for(const ref of refs)await read(ref);}catch{try{await unlock();}catch{}throw fail();}
 function tx(work){if(closed)return Promise.reject(fail());const p=queue.then(async()=>{if(!healthy)throw fail();try{return await work();}catch(e){if(e.safe!==true&&e.code!=='ENOENT')healthy=false;throw fail();}});queue=p.catch(()=>{});return p;}
 return Object.freeze({
  put(ref,record){return tx(async()=>{if(!uuid(ref)||refs.has(ref)||refs.size>=maxRecords)throw rejected();sealed(record,ref);const text=JSON.stringify(record);if(Buffer.byteLength(text)>16384)throw fail();const temp=join(directory,'.cap-'+randomUUID()+'.tmp'),dest=join(directory,ref+'.json');let h;try{h=await open(temp,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);await h.writeFile(text);await h.sync();await h.close();h=null;await link(temp,dest);await unlink(temp);await syncDir();refs.add(ref);return true;}finally{if(h)await h.close();try{await unlink(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}});},
  get:ref=>tx(()=>read(ref)),remove(ref){return tx(async()=>{if(!uuid(ref))throw fail();try{await unlink(join(directory,ref+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}await syncDir();refs.delete(ref);return true;});},list:()=>tx(async()=>Object.freeze([...refs])),close(){if(!closing){closed=true;closing=(async()=>{await queue;await unlock();})();}return closing;}
 });
}
