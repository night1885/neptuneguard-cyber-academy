import pg from 'pg';
import {createFormalReviewStore} from '../formal-review-postgres.mjs';
import {createFormalReviewCore} from '../formal-review-core.mjs';
import {createFormalReviewReceiptRecovery} from '../formal-review-receipt-recovery.mjs';
let c;
try{
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.CERTIFICATION_ENABLED!=='false'||['DATABASE_URL','CERTIFICATION_DATABASE_URL','DISCORD_TOKEN'].some(k=>process.env[k])||typeof process.send!=='function')throw Error();
 c=JSON.parse(process.env.FORMAL_RECOVERY_CHILD);
 if(!/^recover_[a-f0-9]{32}$/.test(c.database)||!/^recover_worker_[a-f0-9]{32}$/.test(c.workerRole)||!['submit','review','inspect'].includes(c.mode))throw Error();
 for(const [address,login] of [[c.workerUrl,c.workerRole],[c.readerUrl,c.workerRole+'_r']]){const u=new URL(address);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/'+c.database||u.username!==login||u.search||u.hash)throw Error();}
 if(c.guildId!=='100000000000000001'||c.ownerId!=='100000000000000002'||c.learnerId!=='100000000000000003'||c.channelId!=='100000000000000004'||c.messageId!=='100000000000000005'||c.body!=='Fictional process-recovery report.')throw Error();
}catch{throw Error('Invalid recovery fixture environment');}
const pool=url=>new pg.Pool({connectionString:url,max:1,connectionTimeoutMillis:3000,options:'-c statement_timeout=2000 -c lock_timeout=1000'});
const worker=pool(c.workerUrl),reader=pool(c.readerUrl);
let store,core,recovery;
const send=value=>new Promise((resolve,reject)=>process.send(value,error=>error?reject(error):resolve()));
try{
 store=createFormalReviewStore({enabled:true,pool:worker,ownerId:c.ownerId,expectedDatabase:c.database,expectedLogin:c.workerRole});
 if((await store.initialize()).ready!==true)throw Error();
 core=createFormalReviewCore({enabled:true,guildId:c.guildId,ownerId:c.ownerId,courseKey:'ethical-hacking-reading',exerciseKeys:['EH-NET-02']},{transaction:store.transaction,isReady:()=>store.ready,now:()=>c.asOfMs??Date.now(),authorizeCourse:async()=>c.allowed===false?null:{studentId:'NG-recovery-fixture',courseKey:'ethical-hacking-reading'},authorizeExercise:async()=>true,authorizeReviewer:async s=>s.actorId===c.ownerId,readSource:async()=>{if(c.mode!=='submit')throw Error();return {messageId:c.messageId,guildId:c.guildId,channelId:c.channelId,authorId:c.learnerId,privateVerified:true,bot:false,forwarded:false,attachmentCount:0,body:c.body,createdAtMs:c.sourceCreatedMs};}});
 let value;
 if(c.mode==='submit')value=await core.submit({actorId:c.learnerId,guildId:c.guildId},c.request);
 else if(c.mode==='review')value=await core.review({actorId:c.ownerId,guildId:c.guildId},c.request);
 else{
  recovery=createFormalReviewReceiptRecovery({enabled:true,guildId:c.guildId,ownerId:c.ownerId,readPool:reader,core,isReady:()=>store.ready,providerTimeoutMs:2000,now:()=>c.asOfMs??Date.now()});
  value=await recovery.inspectLatest({actorId:c.actorId,guildId:c.contextGuild??c.guildId},{workId:c.inspectWork??c.workId});
 }
 if(c.mode!=='inspect'){
  if(value?.ok!==true)throw Error();
  await send({type:'committed',value});
  await new Promise(()=>{setInterval(()=>{},1000);});
 }
 recovery?.dispose();await recovery?.drain();core.dispose();store.dispose();await store.drain();await Promise.all([reader.end(),worker.end()]);
 await send({type:'done',value});process.disconnect();
}catch{
 recovery?.dispose();core?.dispose();store?.dispose();
 await Promise.allSettled([recovery?.drain(),store?.drain(),reader.end(),worker.end()]);
 try{await send({type:'error'});}catch{}
 process.exitCode=1;if(process.connected)process.disconnect();
}
