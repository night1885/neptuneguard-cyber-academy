// Quiescent-startup inventory only: not an atomic live authorization fence.
const exact=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const stamp=x=>Number.isSafeInteger(x)&&x>=0&&x<=8640000000000000;
const denied=()=>Object.freeze({ok:false,admissionReady:false,reason:'recovery-inspection-unavailable'});
export async function inspectReviewRecovery(config={},ports={}){
 if(config.enabled!==true)return denied();const {journal,store,vault,now}=ports,{scopeId,maxJournalEntries=32,maxCapabilities=32}=config;
 try{
  if(!uuid(scopeId)||!Number.isInteger(maxJournalEntries)||maxJournalEntries<1||maxJournalEntries>128||!Number.isInteger(maxCapabilities)||maxCapabilities<1||maxCapabilities>128||typeof journal?.snapshot!=='function'||typeof store?.list!=='function'||typeof vault?.inspect!=='function'||typeof vault?.verifyKey!=='function'||typeof now!=='function')return denied();
  const at=now();if(!stamp(at))return denied();const active=await vault.verifyKey();if(!exact(active,'keyId,scopeId')||active.scopeId!==scopeId||typeof active.keyId!=='string')return denied();
  const s=await journal.snapshot(),refs=await store.list();if(!exact(s,'entries,revision')||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.entries)||s.entries.length>maxJournalEntries||!Array.isArray(refs)||refs.length>maxCapabilities||refs.some(x=>!uuid(x))||new Set(refs).size!==refs.length)return denied();
  const keys=new Set(),caps=new Set();for(const e of s.entries){if(!exact(e,'capabilityRef,cleanupRequested,complete,deadlineMs,deletedEpoch,epoch,key,sender')||!uuid(e.key)||keys.has(e.key)||!uuid(e.capabilityRef)||caps.has(e.capabilityRef)||!stamp(e.deadlineMs)||!['reserved','inflight','unknown','settled'].includes(e.sender)||e.epoch!==(e.sender==='settled'?1:0)||typeof e.cleanupRequested!=='boolean'||typeof e.complete!=='boolean'||!(e.deletedEpoch===null||e.deletedEpoch===e.epoch)||e.deletedEpoch!==null&&!e.cleanupRequested||e.complete!==(e.sender==='settled'&&e.cleanupRequested&&e.deletedEpoch===e.epoch))return denied();keys.add(e.key);caps.add(e.capabilityRef);}
  let orphans=0,retainedCompleted=0,expiredCapabilities=0;for(const ref of refs){const m=await vault.inspect(ref);if(!exact(m,'capabilityRef,cleanupUntilMs,deadlineMs,keyId,scopeId')||m.capabilityRef!==ref||m.scopeId!==scopeId||!stamp(m.deadlineMs)||!stamp(m.cleanupUntilMs)||m.cleanupUntilMs<=m.deadlineMs||typeof m.keyId!=='string')return denied();const linked=s.entries.find(e=>e.capabilityRef===ref);if(linked&&linked.deadlineMs!==m.deadlineMs)return denied();if(!linked)orphans++;else if(linked.complete)retainedCompleted++;if(at>=m.cleanupUntilMs)expiredCapabilities++;}
  const unresolved=s.entries.filter(e=>!e.complete).length,missing=s.entries.filter(e=>!e.complete&&!refs.includes(e.capabilityRef)).length,journalFull=s.entries.length>=maxJournalEntries,vaultFull=refs.length>=maxCapabilities;
  return Object.freeze({ok:true,admissionReady:unresolved===0&&missing===0&&orphans===0&&retainedCompleted===0&&expiredCapabilities===0&&!journalFull&&!vaultFull,unresolved,missingCapabilities:missing,orphanCapabilities:orphans,retainedCompletedCapabilities:retainedCompleted,expiredCapabilities,journalFull,vaultFull});
 }catch{return denied();}
}
