import {randomUUID} from 'node:crypto';
import {FIRST_JOURNEY_PAGES,relatedReadingFor} from './formal-first-journey-content.mjs';
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const neutral=()=>({content:'Formal workspace is unavailable. Use the course entry button to re-enter or contact the approved support route.',embeds:[],components:[],allowedMentions:{parse:[]}});
const validCursor=c=>['overview','help','status'].includes(c)||FIRST_JOURNEY_PAGES.some(p=>new RegExp(`^${p.key}:[0-9]{1,4}$`).test(c));
const same=(a,b)=>a?.actorId===b?.actorId&&a?.courseKey===b?.courseKey&&a?.studentId===b?.studentId;
export function createFormalFirstJourneyNavigation(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({handle:async()=>false,dispose(){}});
 const {guildId,entryChannelId,courseKey,sessionTtlMs,maxSessions,providerTimeoutMs}=config;
 if(config.allowDraftPreview!==true||!id(guildId)||!id(entryChannelId)||courseKey!=='ethical-hacking'||!Number.isSafeInteger(sessionTtlMs)||sessionTtlMs<1000||sessionTtlMs>300000||!Number.isSafeInteger(maxSessions)||maxSessions<1||maxSessions>100||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<5||providerTimeoutMs>1000)throw new Error('Explicit bounded default-off draft navigation profile required');
 for(const name of ['isReady','authorizeCourse','loadPage','now'])if(typeof ports[name]!=='function')throw new Error('Reviewed navigation providers required');
 const sessions=new Map(),inflight=new Set();let stopped=false,lastNow=-1,pending=0,queue=Promise.resolve();
 const now=()=>{const n=ports.now();if(!Number.isSafeInteger(n)||n<0||n<lastNow||n>Number.MAX_SAFE_INTEGER-sessionTtlMs)throw new Error('Clock unavailable');lastNow=n;return n;};
 const ready=()=>{if(stopped)return false;const r=ports.isReady();if(r?.catch)r.catch(()=>{});return r===true;};
 async function call(name,...args){if(stopped||inflight.size>=8)throw new Error('Busy');let timer;
  const work=Promise.resolve().then(()=>name==='member'?args[0].guild.members.fetch(args[1]):ports[name](...args));inflight.add(work);void work.then(()=>inflight.delete(work),()=>inflight.delete(work));
  try{const result=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Provider outcome unknown')),providerTimeoutMs);})]);if(stopped)throw new Error('Stopped');return result;}finally{clearTimeout(timer);}}
 function context(i){if(!ready()||i.isButton?.()!==true||i.guildId!==guildId||i.guild?.id!==guildId||i.channelId!==entryChannelId||!id(i.user?.id)||i.deferred||i.replied)throw new Error('Unavailable');return Object.freeze({actorId:i.user.id,guildId,courseKey});}
 const unchanged=(i,ctx)=>ready()&&i.guildId===ctx.guildId&&i.guild?.id===ctx.guildId&&i.channelId===entryChannelId&&i.user?.id===ctx.actorId;
 async function authorize(i,ctx,previous){
  if(!unchanged(i,ctx))throw new Error('Unavailable');
  const member=await call('member',i,ctx.actorId);
  if(member?.id!==ctx.actorId||!unchanged(i,ctx))throw new Error('Unavailable');
  const a=await call('authorizeCourse',ctx);
  if(a?.actorId!==ctx.actorId||a?.courseKey!==courseKey||typeof a.studentId!=='string'||!a.studentId.trim()||previous&&!same(a,previous)||!unchanged(i,ctx))throw new Error('Unavailable');
  return Object.freeze({actorId:a.actorId,courseKey:a.courseKey,studentId:a.studentId});
 }
 // Membership reads use the SDK-shaped interaction; no client private/member Boolean is authoritative.
 function controls(token,cursor,page){
  const b=(label,next)=>{const custom_id=`fnv:page:${token}:${next}`;if(!validCursor(next)||custom_id.length>100||label.length>80)throw new Error('Bounded control required');return{type:2,style:2,label,custom_id};};
  const navigation=[b('Overview','overview'),b('Help','help'),b('Status','status')];
  if(cursor==='overview')return[{type:1,components:navigation},{type:1,components:[b('Start first practical','start:0')]}];
  if(page.pageKey){const pos=FIRST_JOURNEY_PAGES.findIndex(p=>p.key===page.pageKey);
   if(page.pageIndex>0)navigation.push(b('Previous page',`${page.pageKey}:${page.pageIndex-1}`));
   if(page.pageIndex+1<page.pageCount)navigation.push(b('Next page',`${page.pageKey}:${page.pageIndex+1}`));
   const next=[];if(pos>0)next.push(b('Previous lesson',`${FIRST_JOURNEY_PAGES[pos-1].key}:0`));if(pos+1<FIRST_JOURNEY_PAGES.length)next.push(b('Next lesson',`${FIRST_JOURNEY_PAGES[pos+1].key}:0`));
   const rows=[{type:1,components:navigation},...(next.length?[{type:1,components:next}]:[])],reading=relatedReadingFor(page.pageKey).available;
   for(let n=0;n<reading.length;n+=5)rows.push({type:1,components:reading.slice(n,n+5).map(r=>b(r.label,r.cursor))});
   if(rows.length>5)throw new Error('Too many control rows');return rows;
  }return[{type:1,components:navigation}];
 }
 async function handleOne(i){let token,session,ctx,opening=false;
  const deny=async()=>{try{if(i.deferred||i.replied){if(ctx)await i.editReply(neutral());}else await i.reply({...neutral(),flags:64});}catch{}return true;};
  try{
   ctx=context(i);const stamp=now();for(const [k,s]of sessions)if(stamp>=s.expiresAt)sessions.delete(k);
   opening=i.customId==='fnv:open';let cursor='overview';
   if(opening){for(const[k,s]of sessions)if(s.actorId===ctx.actorId)sessions.delete(k);if(sessions.size>=maxSessions)return deny();token=randomUUID();}
   else{const m=/^fnv:page:([a-f0-9-]{36}):(.+)$/.exec(i.customId);if(!m||!validCursor(m[2]))return deny();token=m[1];cursor=m[2];session=sessions.get(token);
    if(!session||session.actorId!==ctx.actorId||session.guildId!==guildId||session.courseKey!==courseKey||session.channelId!==i.channelId||session.messageId!==i.message?.id||i.message?.flags?.has?.(64)!==true||stamp>=session.expiresAt)return deny();}
   const authorized=await authorize(i,ctx,session?.authorization);
   if(opening){await i.deferReply({flags:64});if(i.ephemeral!==true)return deny();session={...ctx,channelId:entryChannelId,messageId:null,authorization:authorized,expiresAt:now()+sessionTtlMs};}
   else await i.deferUpdate();
   const live=()=>unchanged(i,ctx)&&now()<session.expiresAt&&(opening||sessions.get(token)===session&&i.message?.id===session.messageId&&i.message?.flags?.has?.(64)===true);
   if(!live())throw new Error('Unavailable');
   const page=await call('loadPage',Object.freeze({courseKey,cursor}));
   if(typeof page?.content!=='string'||!page.content||page.content.length>1900)throw new Error('Invalid bounded page');
   if(page.pageKey!==undefined){if(!FIRST_JOURNEY_PAGES.some(p=>p.key===page.pageKey)||cursor!==`${page.pageKey}:${page.pageIndex}`||!Number.isSafeInteger(page.pageIndex)||!Number.isSafeInteger(page.pageCount)||page.pageIndex<0||page.pageIndex>=page.pageCount||page.pageCount>9999)throw new Error('Invalid page metadata');}
   const reading=relatedReadingFor(page.pageKey);
   const notice=reading.available.length?`\n\nRelated reading: use the bound buttons below; source-document links are not viewer routes. ${reading.unavailableCount} reference(s) remain outside this viewer.`:reading.unavailableCount?`\n\nRelated reading: ${reading.unavailableCount} reference(s) remain outside this viewer. No related-reading shortcut is available here; source-document links are not viewer routes.`:'';
   const viewContent=page.content+notice;if(viewContent.length>1900)throw new Error('Reference notice exceeds page bounds');
   await authorize(i,ctx,authorized);if(!live())throw new Error('Unavailable');
   const message=await i.editReply({content:viewContent,embeds:[],components:controls(token,cursor,page),allowedMentions:{parse:[]}});
   if(opening){if(!id(message?.id)||message.flags?.has?.(64)!==true||!live())throw new Error('Private message unavailable');session.messageId=message.id;sessions.set(token,session);}
   return true;
  }catch{if(token&&session&&sessions.get(token)===session)sessions.delete(token);return deny();}
 }
 return Object.freeze({handle(i){if(typeof i?.customId!=='string'||!i.customId.startsWith('fnv:'))return Promise.resolve(false);
  if(stopped||pending>=20){return Promise.resolve().then(async()=>{if(!i.deferred&&!i.replied)try{await i.reply({...neutral(),flags:64});}catch{}return true;});}
  pending++;const task=queue.then(()=>handleOne(i));queue=task.then(()=>{},()=>{});return task.finally(()=>{pending--;});},dispose(){stopped=true;sessions.clear();}});
}
