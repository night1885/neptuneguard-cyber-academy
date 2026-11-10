import { randomUUID } from 'node:crypto';
import { ModalBuilder } from 'discord.js';
import { COURSE_SECTION_KEYS, createCourseSectionAuthorization, createCourseSectionLoginHandler } from './certification-course-sections.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';
const validId=value=>typeof value==='string'&&/^[0-9]{17,20}$/.test(value);
const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const cursorPattern=/^(overview|module|lesson|lab|hint|quiz|answer):[0-9]{1,4}:[0-9]{1,4}(?::[a-z0-9-]{1,16})?$/;
const json=value=>typeof value?.toJSON==='function'?value.toJSON():value;
export function createProtectedCourseNavigation(pool,config,guildId,{verifiedRoleId,renderPage,now=Date.now,ttlMs=300000,maxSessions=1000,buttonOnlyEntry=false}={}){
 if(config?.enabled!==true||!validId(guildId)||!validId(verifiedRoleId)||typeof renderPage!=='function'||typeof now!=='function'||typeof buttonOnlyEntry!=='boolean'||!Number.isSafeInteger(ttlMs)||ttlMs<1000||ttlMs>300000||!Number.isSafeInteger(maxSessions)||maxSessions<1||maxSessions>1000)throw Error('Explicit course navigation context, renderer and bounded sessions required');
 const allowed=new Set(COURSE_SECTION_KEYS),grants=new Map(),authorize=createCourseSectionAuthorization(pool,config);
 const roleReads=createStatusReadGuard({now,limit:30}),pageReads=createStatusReadGuard({now,limit:30});let disposed=false,login;
 const time=()=>{const n=now();if(!Number.isSafeInteger(n)||n<0||n>Number.MAX_SAFE_INTEGER-ttlMs)throw Error('Invalid navigation clock');return n;};
 const context=i=>{const origin=i.message?.interactionMetadata?.user?.id||i.message?.interaction?.user?.id;return !disposed&&config.enabled===true&&i.guildId===guildId&&i.guild?.id===guildId&&validId(i.user?.id)&&!(i.message?.flags?.has?.(64)===true&&origin&&origin!==i.user.id);};
 const respond=(i,payload)=>{const p={content:'',embeds:[],components:[],...payload,allowedMentions:{parse:[]}};return i.deferred||i.replied?i.editReply(p):i.reply({...p,flags:64});};
 const deny=i=>respond(i,{content:'Course navigation is unavailable, expired, or no longer authorized. Re-enter the course and check your current assignment.'});
 function forget(token){const g=grants.get(token);if(g)clearTimeout(g.timer);grants.delete(token);}
 const purge=()=>{const stamp=time();for(const [token,g] of grants)if(g.expiresAt<=stamp)forget(token);};
 const live=(i,token,g)=>context(i)&&grants.get(token)===g&&g&&g.actor===i.user.id&&g.guildId===i.guildId&&time()<g.expiresAt;
 const matches=(a,g)=>a?.student_id===g.studentId&&a?.course_key===g.courseKey;
 function grant(i,courseKey,studentId){purge();for(const [token,g] of grants)if(g.actor===i.user.id&&g.courseKey===courseKey)forget(token);if(grants.size>=maxSessions)throw Error('Course session capacity reached');const token=randomUUID(),g={actor:i.user.id,guildId,courseKey,studentId,expiresAt:time()+ttlMs};grants.set(token,g);g.timer=setTimeout(()=>forget(token),ttlMs);g.timer.unref?.();return token;}
 function safePayload(payload,token){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Course page payload required');const rows=(payload.components||[]).map(json);
  if(!Array.isArray(rows)||rows.length>5||(payload.content!==undefined&&(typeof payload.content!=='string'||payload.content.length>2000))||(payload.embeds!==undefined&&(!Array.isArray(payload.embeds)||payload.embeds.length>10)))throw Error('Invalid course page bounds');
  const prefix=`cert:course:page:${token}:`;for(const r of rows){if(r.type!==1||!Array.isArray(r.components)||!r.components.length||r.components.length>5)throw Error('Invalid course controls');for(const raw of r.components){const b=json(raw);if(b.type!==2||b.url||typeof b.custom_id!=='string'||b.custom_id.length>100||!b.custom_id.startsWith(prefix)||!cursorPattern.test(b.custom_id.slice(prefix.length)))throw Error('Course control must stay within its bound session');}}
  return {content:payload.content||'',embeds:payload.embeds||[],components:rows};
 }
 async function deliver(i,token,cursor,alreadyDeferred=false){
  const g=grants.get(token);if(!live(i,token,g))return deny(i);if(!alreadyDeferred)await i.deferReply({flags:64});
  try{await pageReads.run(i.user.id,async()=>{if(!matches(await authorize(g.actor,g.courseKey),g)||!live(i,token,g)){forget(token);await deny(i);return;}
   const buttonId=next=>{if(typeof next!=='string'||!cursorPattern.test(next))throw Error('Invalid course cursor');const id=`cert:course:page:${token}:${next}`;if(id.length>100)throw Error('Course control too long');return id;};
   const payload=safePayload(await renderPage({courseKey:g.courseKey,cursor,buttonId}),token);
   if(!live(i,token,g)||!matches(await authorize(g.actor,g.courseKey),g)||!live(i,token,g)){forget(token);await deny(i);return;}
   await respond(i,payload);});}catch{forget(token);await deny(i);}
 }
 login=buttonOnlyEntry?null:createCourseSectionLoginHandler(pool,config,guildId,{now,ttlMs,async onVerified(i,courseKey){if(!context(i))throw Error('Course context changed');const studentId=i.fields.getTextInputValue('student_id').trim();await deliver(i,grant(i,courseKey,studentId),'overview:0:0',true);}});
 async function handle(i){
  const id=i.customId||'';if(!id.startsWith('cert:course:'))return false;if(!context(i)){await deny(i);return true;}
  try{purge();const open=/^cert:course:open:([a-z0-9][a-z0-9-]{0,39})$/.exec(id),submit=new RegExp(`^cert:course:submit:(${uuid})$`).exec(id),page=new RegExp(`^cert:course:page:(${uuid}):(.+)$`).exec(id);
   if((open&&(!i.isButton?.()||!allowed.has(open[1])))||(submit&&(buttonOnlyEntry||!i.isModalSubmit?.()))||(page&&(!i.isButton?.()||!cursorPattern.test(page[2])||!live(i,page[1],grants.get(page[1]))))||(!open&&!submit&&!page)){await deny(i);return true;}
   const member=await roleReads.run(i.user.id,()=>i.guild.members.fetch(i.user.id));if(!context(i)||member?.id!==i.user.id||!member.roles?.cache?.has(verifiedRoleId)){if(page)forget(page[1]);await deny(i);return true;}
   if(page){await deliver(i,page[1],page[2]);return true;}
   if(open&&buttonOnlyEntry){await i.deferReply({flags:64});const a=await pageReads.run(i.user.id,()=>authorize(i.user.id,open[1]));if(!context(i)||a?.course_key!==open[1]||typeof a.student_id!=='string'||!a.student_id.trim()){await deny(i);return true;}await deliver(i,grant(i,open[1],a.student_id),'overview:0:0',true);return true;}
   const adaptedId=open?`cert:section:open:${open[1]}`:`cert:section:submit:${submit[1]}`;
   const adapter=new Proxy(i,{get(t,k){if(k==='customId')return adaptedId;if(k==='showModal')return modal=>{const data=modal.toJSON();if(!new RegExp(`^cert:section:submit:${uuid}$`).test(data.custom_id))throw Error('Invalid course modal');return t.showModal(ModalBuilder.from(data).setCustomId(data.custom_id.replace('cert:section:submit:','cert:course:submit:')));};const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}});await login(adapter);return true;
  }catch{await deny(i);return true;}
 }
 return Object.freeze({handle,dispose(){disposed=true;for(const token of grants.keys())forget(token);login=null;}});
}
