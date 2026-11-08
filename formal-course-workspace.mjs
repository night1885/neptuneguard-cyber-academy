import {randomUUID} from 'node:crypto';
import {isStudentCourseSet} from './formal-student-packages.mjs';
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const empty=()=>({content:'Course workspace unavailable. Re-enter from the course entry button.',embeds:[],components:[],allowedMentions:{parse:[]}});
const safe=x=>x.replace(/[\`*_~|<>@]/g,c=>'\\'+c);
export function createFormalCourseWorkspace(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({handle:async()=>false,dispose:async()=>({drained:true})});
 const {guildId,entryChannelId,entryMessageId,botUserId,verifiedRoleId,sessionTtlMs=300000,maxSessions=100,providerTimeoutMs=1000,drainMs=1000}=config;
 if(![guildId,entryChannelId,entryMessageId,botUserId,verifiedRoleId].every(id)||!Number.isSafeInteger(sessionTtlMs)||sessionTtlMs<1000||sessionTtlMs>300000||!Number.isSafeInteger(maxSessions)||maxSessions<1||maxSessions>100||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<5||providerTimeoutMs>1000||!Number.isSafeInteger(drainMs)||drainMs<5||drainMs>2000||!isStudentCourseSet(ports.packageSet)||typeof ports.authorizeCourse!=='function'||typeof ports.bookmarks?.load!=='function'||typeof ports.bookmarks?.save!=='function'||typeof ports.now!=='function'||typeof ports.isReady!=='function')throw new Error('Explicit reviewed workspace profile required');
 const packages=ports.packageSet,sessions=new Set(),controls=new Map(),busy=new Set(),pending=new Set(),active=new Set();let stopped=false,lastTime=-1,closing;
 const now=()=>{const n=ports.now();if(!Number.isSafeInteger(n)||n<0||n<lastTime||n>Number.MAX_SAFE_INTEGER-sessionTtlMs)throw new Error('Clock unavailable');lastTime=n;return n;};
 const ready=()=>{if(stopped)return false;const r=ports.isReady();if(r?.catch)r.catch(()=>{});return r===true;};
 function retire(s){for(const k of s.tokens)controls.delete(k);s.tokens=[];}
 function remove(s){retire(s);sessions.delete(s);}
 function purge(){const n=now();for(const s of sessions)if(n>=s.expiresAt)remove(s);}
 async function call(fn){if(stopped||pending.size>=8)throw new Error('Busy');let timer;const task=Promise.resolve().then(fn);pending.add(task);void task.then(()=>pending.delete(task),()=>pending.delete(task));try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Provider outcome unknown')),providerTimeoutMs);})]);}finally{clearTimeout(timer);}}
 function unchanged(i,s){return ready()&&i.isButton?.()===true&&i.user?.id===s.actorId&&i.guildId===guildId&&i.guild?.id===guildId&&i.channelId===entryChannelId&&i.message?.author?.id===botUserId&&now()<s.expiresAt;}
 function privateBound(i,s){const origin=i.message?.interactionMetadata?.user?.id||i.message?.interaction?.user?.id;return i.message?.id===s.messageId&&i.message?.flags?.has?.(64)===true&&(!origin||origin===s.actorId);}
 async function authorize(i,s){
  if(!unchanged(i,s))throw new Error('Context changed');
  const member=await call(()=>i.guild.members.fetch(s.actorId));
  if(member?.id!==s.actorId||member.roles?.cache?.has(verifiedRoleId)!==true||!unchanged(i,s))throw new Error('Member unavailable');
  const a=await call(()=>ports.authorizeCourse(Object.freeze({actorId:s.actorId,courseKey:s.courseKey})));
  if(a?.actorId!==s.actorId||a?.courseKey!==s.courseKey||typeof a.studentId!=='string'||!a.studentId.trim()||a.studentId.length>100||s.studentId&&s.studentId!==a.studentId||!unchanged(i,s))throw new Error('Course unavailable');
  s.studentId=a.studentId;
 }
 function position(p,lessonKey,pageIndex){const n=p.lessons.findIndex(l=>l.key===lessonKey);if(n<0||!Number.isSafeInteger(pageIndex)||pageIndex<0||pageIndex>=p.lessons[n].pageCount)throw new Error('Invalid saved position');return{lesson:n,page:pageIndex};}
 function bookmark(result,p){if(!result||!Number.isSafeInteger(result.version)||result.version<0||result.version>2147483646||result.revision!==p.revision)throw new Error('Bookmark unavailable');if(result.status==='empty'&&result.version===0)return{version:0,position:null,changed:false};if(result.status==='revision_changed'&&result.version>0)return{version:result.version,position:null,changed:true};if(result.status==='saved'&&result.version>0)return{version:result.version,position:position(p,result.lessonKey,result.pageIndex),changed:false};throw new Error('Bookmark unavailable');}
 function rows(s){
  const p=packages.describe(s.courseKey),current=s.cursor,l=current&&p.lessons[current.lesson],last=current&&current.lesson===p.lessons.length-1&&current.page===l.pageCount-1;
  const button=(label,action,disabled=false)=>{const token=randomUUID();controls.set(token,{session:s,action});s.tokens.push(token);return{type:2,style:2,label,custom_id:'fws:act:'+token,disabled};};
  return[{type:1,components:[button('Overview','overview'),button('Back','back',!current),button(current?'Next':'Start course','next',Boolean(last)),button('Save position','save',!current||Boolean(s.special)),button('Resume','resume')]},{type:1,components:[button('Help','help'),button('Reading status','status')]}];
 }
 async function render(i,s,notice=''){
  const p=packages.describe(s.courseKey);let content;
  if(s.special==='help')content='Use Start/Next/Back to read, Save position to bookmark, and Resume to reload the stored position. Saving does not complete a lesson, grant lab access or issue a certificate.';
  else if(s.special==='status')content=`Reading bookmark version ${s.version}. Reading location is not a completion or assessment record.`;
  else if(!s.cursor)content=`${safe(p.title)}\n${p.lessons.length} lessons in this supplied student package. Start or Resume below. No completion or award is determined here.`;
  else{const l=p.lessons[s.cursor.lesson],page=packages.page(s.courseKey,l.key,s.cursor.page);content=`${safe(l.title)} — page ${s.cursor.page+1}/${l.pageCount}\n${page.content}`;}
  if(notice)content+='\n\n'+notice;
  if(content.length>1900)throw new Error('Page bounds');
  await authorize(i,s);
  if(s.messageId&&!privateBound(i,s))throw new Error('Private binding changed');
  const payload={content,embeds:[],components:rows(s),allowedMentions:{parse:[]}};
  const m=await i.editReply(payload);
  if(!id(m?.id)||m.flags?.has?.(64)!==true||s.messageId&&m.id!==s.messageId||!unchanged(i,s))throw new Error('Private result unavailable');
  s.messageId=m.id;sessions.add(s);
 }
 async function handle(i){
  if(typeof i?.customId!=='string'||!i.customId.startsWith('fws:'))return false;
  let s,ownedReply=false,lock,operating=false;
  const deny=async()=>{try{if(ownedReply)await i.editReply(empty());else if(!i.deferred&&!i.replied)await i.reply({...empty(),flags:64});}catch{}return true;};
  try{
   if(!ready()||i.isButton?.()!==true||i.deferred||i.replied||!id(i.user?.id)||i.guildId!==guildId||i.guild?.id!==guildId||i.channelId!==entryChannelId||i.message?.author?.id!==botUserId)return deny();
   purge();const open=/^fws:open:(ethical-hacking|incident-response)$/.exec(i.customId);let action;
   if(open){if(i.message?.id!==entryMessageId||!packages.describe(open[1]))return deny();s={actorId:i.user.id,courseKey:open[1],expiresAt:now()+sessionTtlMs,messageId:null,studentId:null,cursor:null,special:null,version:0,tokens:[]};}
   else{const m=/^fws:act:([a-f0-9-]{36})$/.exec(i.customId),c=m&&controls.get(m[1]);if(!c)return deny();s=c.session;action=c.action;if(!sessions.has(s)||s.actorId!==i.user.id||!privateBound(i,s)||!unchanged(i,s))return deny();}
   lock=s.actorId+':'+s.courseKey;if(busy.has(lock)||busy.size>=8){lock=null;return deny();}busy.add(lock);operating=true;
   if(open){for(const old of sessions)if(old.actorId===s.actorId&&old.courseKey===s.courseKey)remove(old);if(sessions.size>=maxSessions)return deny();sessions.add(s);await i.deferReply({flags:64});if(i.ephemeral!==true)throw new Error('Private acknowledgment required');ownedReply=true;}
   else{retire(s);await i.deferUpdate();ownedReply=true;}
   await authorize(i,s);const p=packages.describe(s.courseKey),input=Object.freeze({actorId:s.actorId,courseKey:s.courseKey});let notice='';
   if(open||action==='resume'){
    const b=bookmark(await call(()=>ports.bookmarks.load(input)),p);s.version=b.version;s.special=null;
    if(action==='resume')s.cursor=b.position;
    notice=b.changed?'Course revision changed. Start from the overview and explicitly save a new position.':action==='resume'&&!b.position?'No saved position. Start the course below.':'';
   }else if(action==='save'){
    if(!s.cursor||s.special)throw new Error('No reading position selected');const l=p.lessons[s.cursor.lesson],page=s.cursor.page,expected=s.version;
    const r=await call(()=>ports.bookmarks.save(Object.freeze({...input,revision:p.revision,lessonKey:l.key,pageIndex:page,expectedVersion:expected})));
    if(r?.status==='conflict'){
     const b=bookmark(await call(()=>ports.bookmarks.load(input)),p);s.version=b.version;s.cursor=null;notice='Another session changed the saved position. Use Resume or start again; nothing was automatically retried.';
    }else{const b=bookmark(r,p);if(!b.position||b.position.lesson!==s.cursor.lesson||b.position.page!==page||b.version!==expected+1)throw new Error('Save result mismatch');s.version=b.version;notice='Reading position saved. This is not lesson completion.';}
   }else if(action==='overview'){s.cursor=null;s.special=null;}
   else if(action==='help'||action==='status'){s.special=action;}
   else if(action==='next'){
    s.special=null;if(!s.cursor)s.cursor={lesson:0,page:0};else{const l=p.lessons[s.cursor.lesson];if(s.cursor.page+1<l.pageCount)s.cursor={lesson:s.cursor.lesson,page:s.cursor.page+1};else if(s.cursor.lesson+1<p.lessons.length)s.cursor={lesson:s.cursor.lesson+1,page:0};else throw new Error('End of package');}
   }else if(action==='back'){
    s.special=null;if(!s.cursor)throw new Error('No previous page');if(s.cursor.page>0)s.cursor={lesson:s.cursor.lesson,page:s.cursor.page-1};else if(s.cursor.lesson>0)s.cursor={lesson:s.cursor.lesson-1,page:p.lessons[s.cursor.lesson-1].pageCount-1};else s.cursor=null;
   }else throw new Error('Unknown action');
   await render(i,s,notice);return true;
  }catch{if(s&&operating)remove(s);return deny();}
  finally{if(lock)busy.delete(lock);}
 }
 return Object.freeze({handle(i){const task=handle(i);active.add(task);void task.then(()=>active.delete(task),()=>active.delete(task));return task;},dispose(){stopped=true;for(const s of sessions)remove(s);if(!closing){let timer;closing=Promise.race([Promise.allSettled([...pending,...active]).then(()=>({drained:true})),new Promise(resolve=>{timer=setTimeout(()=>resolve({drained:false}),drainMs);})]).finally(()=>clearTimeout(timer));}return closing;}});
}
