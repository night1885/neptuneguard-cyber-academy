import {createHash} from 'node:crypto';
import {requireDisposableRecoveryProfile} from './receipt-recovery-profile.mjs';
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const text=x=>typeof x==='string'&&x.trim()&&Array.from(x).length<=2000&&Buffer.byteLength(x,'utf8')<=8192;
const scope=Object.freeze(['demo-workspace','demo-ethical-hacking','demo-first-practical']);
const names=new Set(['adapter_binding','adapter_journal_read','adapter_journal_write','adapter_submit','adapter_receipt','adapter_discover','adapter_read','adapter_review','adapter_claim_draft','adapter_finish_draft']);
const unavailable=()=>new Error('Disposable intake storage unavailable');
export function createDisposableIntakeAdapter(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,initialize:async()=>({ready:false}),dispose(){}});
 const {pool,env,recordId,guildId,productionGuildId,learnerId,ownerId}=options;
 requireDisposableRecoveryProfile(env);
 if(env.DISCORD_TOKEN||env.CERTIFICATION_DATABASE_URL||env.CERTIFICATION_ENABLED==='true'||typeof pool?.query!=='function'||!uuid(recordId)||![guildId,productionGuildId,learnerId,ownerId].every(id)||guildId===productionGuildId||learnerId===ownerId)throw unavailable();
 let stopped=false,ready=false;
 const actor=a=>a===learnerId?'demo-learner':a===ownerId?'demo-reviewer':null;
 function binding(b){if(!ready||stopped||b?.recordId!==recordId||b.guildId!==guildId||b.learnerId!==learnerId||b.courseKey!==scope[1]||b.exerciseKey!==scope[2]||!actor(b.actorId))throw unavailable();return[actor(b.actorId),...scope,recordId];}
 async function call(name,args){if(!ready||stopped||!names.has(name))throw unavailable();try{const r=(await pool.query(`SELECT synthetic_review_ci.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0]?.r;if(stopped)throw unavailable();return r;}catch{throw unavailable();}}
 function envelope(r,body=false){if(r===null||r?.ok!==true)return r;if(r.recordId!==recordId||r.learnerId!=='demo-learner'||r.sourceGuildId!==guildId||!uuid(r.reportId)||!id(r.sourceChannelId)||!id(r.sourceMessageId))throw unavailable();
  const fields=['ok','reportId','recordId','revision','digest','submittedAtMs','expiresAtMs','sourceGuildId','sourceChannelId','sourceMessageId','sourceCreatedAtMs',...(body?['body']:[])];return Object.freeze({...Object.fromEntries(fields.map(k=>[k,r[k]])),learnerId});}
 async function resolve(ctx){if(!ready||stopped||ctx?.guildId!==guildId||!actor(ctx.actorId))throw unavailable();const op=['prepare','preview','submit'].includes(ctx.action)?'submit':['review','draft-delete'].includes(ctx.action)?'review':null;
  if(!op||(op==='review'&&ctx.actorId!==ownerId)||(op==='submit'&&ctx.actorId!==learnerId))throw unavailable();
  const b=await call('adapter_binding',[actor(ctx.actorId),...scope,recordId,op]);if(b?.ok!==true||b.recordId!==recordId||b.learnerId!=='demo-learner'||b.courseKey!==scope[1]||b.exerciseKey!==scope[2]||!Number.isSafeInteger(b.revision)||b.revision<0)throw unavailable();return Object.freeze({recordId,learnerId,courseKey:scope[1],exerciseKey:scope[2],revision:b.revision});}
 return Object.freeze({enabled:true,get ready(){return ready&&!stopped;},
  async initialize(){if(stopped)throw unavailable();try{const r=(await pool.query("SELECT current_database() AS db,current_user AS actor,current_setting('server_version_num')::int/10000 AS major,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname=current_user) AS elevated,to_regprocedure('synthetic_review_ci.adapter_submit(text,text,text,text,uuid,integer,uuid,text,text,text,text,bigint)') IS NOT NULL AS installed")).rows[0];
   if(stopped||r?.db!=='synthetic_review_test'||r.actor!=='synthetic_review_worker'||r.major!==Number(env.SYNTHETIC_PG_MAJOR)||r.elevated!==false||r.installed!==true)throw unavailable();ready=true;return Object.freeze({ready:true,mode:'disposable-rehearsal-only'});}catch{ready=false;throw unavailable();}},resolve,
  async authorize(b){try{binding(b);const r=await resolve(b);return ['recordId','learnerId','courseKey','exerciseKey'].every(k=>r[k]===b[k]);}catch{return false;}},
  async journalRead(b){const r=await call('adapter_journal_read',[...binding(b),guildId]);if(r?.ok!==true)throw unavailable();return r.journal;},
  async journalWrite(b,j){if(!uuid(j?.operationId)||!['creating','verify-pending','available','reconcile-required'].includes(j.state)||(j.channelId!==undefined&&!id(j.channelId)))throw unavailable();const r=await call('adapter_journal_write',[...binding(b),guildId,j.operationId,j.state,j.channelId??null]);if(r?.ok!==true)throw unavailable();},
  async receipt(b,q){if(!uuid(q))throw unavailable();return envelope(await call('adapter_receipt',[...binding(b),q,guildId]));},
  async submit(b,p){if(!uuid(p?.requestId)||!Number.isSafeInteger(p.expectedRevision)||p.expectedRevision<0||!text(p.body)||!id(p.channelId)||!id(p.messageId)||!Number.isSafeInteger(p.createdAtMs)||p.createdAtMs<0||createHash('sha256').update(p.body).digest('hex')!==p.digest)throw unavailable();return envelope(await call('adapter_submit',[...binding(b),p.expectedRevision,p.requestId,p.body,guildId,p.channelId,p.messageId,p.createdAtMs]));},
  async discoverReceipts(b,n=10){if(!Number.isSafeInteger(n)||n<1||n>20)throw unavailable();const r=await call('adapter_discover',[...binding(b),guildId,n]);if(r?.ok!==true||!Array.isArray(r.items)||r.items.length>n||r.items.some(x=>!uuid(x.requestId)||!uuid(x.reportId)||!Number.isSafeInteger(x.revision)||!Number.isSafeInteger(x.expiresAtMs)))throw unavailable();return Object.freeze(r.items.map(x=>Object.freeze({requestId:x.requestId,reportId:x.reportId,revision:x.revision,expiresAtMs:x.expiresAtMs})));},
  async readReport(b,s){if(!uuid(s))throw unavailable();return envelope(await call('adapter_read',[...binding(b),s,guildId]),true);},
  async review(b,p){if(b.actorId!==ownerId||!uuid(p?.reportId)||!Number.isSafeInteger(p.expectedRevision)||p.expectedRevision<0||!['changes-requested','review-recorded'].includes(p.decision)||!text(p.feedback))throw unavailable();return envelope(await call('adapter_review',[...binding(b),p.expectedRevision,p.reportId,p.decision,p.feedback,guildId]));},
  async claimDraft(b,p){if(b.actorId!==ownerId||!id(p?.channelId)||!id(p.messageId)||!Number.isSafeInteger(p.createdAtMs)||p.createdAtMs<0||p.deadlineMs!==p.createdAtMs+86400000)throw unavailable();const r=await call('adapter_claim_draft',[...binding(b),guildId,p.channelId,p.messageId,p.createdAtMs]);if(r?.claimed!==true)return Object.freeze({claimed:false});if(!uuid(r.token))throw unavailable();return Object.freeze({claimed:true,token:r.token});},
  async finishDraft(b,token,outcome){if(b.actorId!==ownerId||!uuid(token)||!['confirmed','unknown'].includes(outcome))throw unavailable();const r=await call('adapter_finish_draft',[...binding(b),token,outcome]);if(r?.ok!==true||r.outcome!=='confirmed')throw unavailable();return Object.freeze({ok:true});},
  dispose(){stopped=true;ready=false;}
 });
}
