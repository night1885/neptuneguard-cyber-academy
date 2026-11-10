import {discordId,operationId,exactFields,boundedReviewText,reviewClock,REVIEW_POLICY} from './formal-review-policy.mjs';
const fail=()=>{throw Error('Formal source unavailable');};
const VIEW=1n<<10n,HISTORY=1n<<16n,SEND=1n<<11n,ADMIN=8n;
const bits=x=>{if(typeof x!=='string'||!/^(0|[1-9][0-9]{0,19})$/.test(x))fail();return BigInt(x);};
const scopeFields=['actorId','guildId','learnerId','studentId','courseKey','exerciseKey','workId','sourceChannelId'];
export function createFormalDiscordSource(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false,readSource:async()=>null,verifyPrivateChannel:async()=>false,dispose(){},drain:async()=>{}});
 const {guildId,ownerId,botId,token,isReady,now=Date.now,fetchImpl=globalThis.fetch,providerTimeoutMs=1000,privacyMode='owner-only',verifyAdministrator}=options;
 if(!['owner-only','administrator-and-learner'].includes(privacyMode)||(privacyMode==='administrator-and-learner'&&typeof verifyAdministrator!=='function'))fail();
 const administratorsAllowed=privacyMode==='administrator-and-learner';
 if(![guildId,ownerId,botId].every(discordId)||new Set([guildId,ownerId,botId]).size!==3||typeof token!=='string'||!/^[A-Za-z0-9._-]{20,256}$/.test(token)||typeof isReady!=='function'||typeof now!=='function'||typeof fetchImpl!=='function'||!Number.isSafeInteger(providerTimeoutMs)||providerTimeoutMs<20||providerTimeoutMs>2000)fail();
 let stopped=false;const active=new Set(),requests=new Set(),controllers=new Set(),deadlines=new WeakMap();
 function check(c){if(stopped||c.signal.aborted||performance.now()>=deadlines.get(c)||isReady()!==true)fail();}
 function get(path,c,maxBytes=262144){
  check(c);if(requests.size>=16)fail();
  const task=(async()=>{let r,reader,done=false;
   try{r=await fetchImpl('https://discord.com/api/v10'+path,{method:'GET',redirect:'error',cache:'no-store',headers:{Authorization:'Bot '+token,'Cache-Control':'no-cache'},signal:c.signal});check(c);
    if(r.status!==200||!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')||'')||!r.body?.getReader)fail();
    const length=r.headers.get('content-length');if(length!==null&&(!/^[0-9]+$/.test(length)||Number(length)>maxBytes))fail();
    reader=r.body.getReader();const bytes=new Uint8Array(maxBytes);let count=0;
    for(;;){check(c);const part=await reader.read();check(c);if(part.done){done=true;break;}if(!(part.value instanceof Uint8Array)||part.value.byteLength>maxBytes-count)fail();bytes.set(part.value,count);count+=part.value.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,count)));
   }finally{if(!done){if(reader)await reader.cancel().catch(()=>{});else await r?.body?.cancel?.().catch(()=>{});}reader?.releaseLock();}
  })();
  requests.add(task);void task.then(()=>requests.delete(task),()=>requests.delete(task));return task;
 }
 async function snapshot(s,c){
  const [me,g,roles,ch]=await Promise.all([get('/users/@me',c),get('/guilds/'+guildId,c),get('/guilds/'+guildId+'/roles',c),get('/channels/'+s.sourceChannelId,c)]);check(c);
  if(me?.id!==botId||me.bot!==true||g?.id!==guildId||g.owner_id!==ownerId||ch?.id!==s.sourceChannelId||ch.guild_id!==guildId||ch.type!==0||!Array.isArray(roles)||roles.length<1||roles.length>500||!Array.isArray(ch.permission_overwrites)||ch.permission_overwrites.length!==4)fail();
  const ids=new Set(),roleProof=[];
  for(const r of roles){if(!discordId(r?.id)||ids.has(r.id))fail();const permissions=bits(r.permissions);if((permissions&ADMIN)!==0n&&(!administratorsAllowed||r.id===guildId))fail();ids.add(r.id);roleProof.push([r.id,r.permissions]);}if(!ids.has(guildId))fail();
  const participants=new Set([s.learnerId,ownerId,botId]),seen=new Set(),overwrites=[];
  for(const o of ch.permission_overwrites){if(!discordId(o?.id)||seen.has(o.id))fail();seen.add(o.id);const allow=bits(o.allow),deny=bits(o.deny);if((allow&deny)!==0n)fail();
   if(o.id===guildId){if(o.type!==0||allow!==0n||(deny&VIEW)===0n)fail();}
   else if(o.type!==1||!participants.has(o.id)||(allow&(VIEW|HISTORY))!==(VIEW|HISTORY)||(allow&~(VIEW|HISTORY|SEND))!==0n||deny!==0n)fail();
   overwrites.push([o.id,o.type,o.allow,o.deny]);
  }
  if(!seen.has(guildId)||![...participants].every(x=>seen.has(x)))fail();
  return JSON.stringify([g.owner_id,me.id,roleProof.sort((a,b)=>a[0].localeCompare(b[0])),overwrites.sort((a,b)=>a[0].localeCompare(b[0]))]);
 }
 function message(m,s,id){
  if(m?.id!==id||m.channel_id!==s.sourceChannelId||m.type!==0||m.author?.id!==s.learnerId||![undefined,false].includes(m.author.bot)||m.author.system===true||m.tts!==false||m.mention_everyone!==false||!Array.isArray(m.attachments)||m.attachments.length||!Array.isArray(m.embeds)||m.embeds.length||!boundedReviewText(m.content))fail();
  for(const k of ['message_reference','referenced_message','webhook_id','application_id','application','interaction','interaction_metadata','thread','poll','activity','call'])if(k in m)fail();
  for(const k of ['message_snapshots','components','sticker_items','stickers'])if(k in m&&(!Array.isArray(m[k])||m[k].length))fail();
  const flags=m.flags??0;if(!Number.isSafeInteger(flags)||flags<0||(BigInt(flags)&~4100n)!==0n)fail();
  if(typeof m.timestamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(m.timestamp))fail();
  const createdAtMs=Number((BigInt(id)>>22n)+1420070400000n),stamp=reviewClock(now());
  if(Date.parse(m.timestamp)!==createdAtMs||createdAtMs>stamp||stamp>=reviewClock(createdAtMs)+REVIEW_POLICY.draftMs)fail();
  return Object.freeze({messageId:id,guildId,channelId:s.sourceChannelId,authorId:s.learnerId,privateVerified:true,bot:false,forwarded:false,attachmentCount:0,body:m.content,createdAtMs});
 }
 async function readSource(scope,id){
  let c,timer;
  try{
   if(!exactFields(scope,scopeFields)||scope.guildId!==guildId||!discordId(scope.learnerId)||scope.actorId!==scope.learnerId||[ownerId,botId].includes(scope.learnerId)||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100||scope.courseKey!=='ethical-hacking-reading'||!/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(scope.exerciseKey)||!operationId(scope.workId)||!discordId(scope.sourceChannelId)||!discordId(id)||active.size>=4)fail();
   const s=Object.freeze({...scope});c=new AbortController();deadlines.set(c,performance.now()+providerTimeoutMs);check(c);controllers.add(c);
   const task=(async()=>{const before=await snapshot(s,c);const m=await get('/channels/'+s.sourceChannelId+'/messages/'+id,c,32768);const value=message(m,s,id);if(before!==await snapshot(s,c))fail();check(c);message(m,s,id);return value;})();
   active.add(task);const cleanup=()=>{active.delete(task);controllers.delete(c);c.abort();};void task.then(cleanup,cleanup);
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{c.abort();reject(Error('Formal source unavailable'));},providerTimeoutMs);});
   return await Promise.race([task,timeout]);
  }catch{c?.abort();return null;}finally{clearTimeout(timer);}
 }
 async function verifyPrivateChannel(scope){
  let c,timer;
  try{
   if(!exactFields(scope,scopeFields)||scope.guildId!==guildId||!discordId(scope.learnerId)||!discordId(scope.actorId)||(!administratorsAllowed&&![scope.learnerId,ownerId].includes(scope.actorId))||[ownerId,botId].includes(scope.learnerId)||typeof scope.studentId!=='string'||!scope.studentId.trim()||scope.studentId.length>100||scope.courseKey!=='ethical-hacking-reading'||typeof scope.exerciseKey!=='string'||!/^EH-[A-Z]+-[A-Z0-9-]{2,40}$/.test(scope.exerciseKey)||!operationId(scope.workId)||!discordId(scope.sourceChannelId)||active.size>=4)fail();
   const s=Object.freeze({...scope});c=new AbortController();deadlines.set(c,performance.now()+providerTimeoutMs);check(c);controllers.add(c);
   const authority=async()=>{check(c);if(administratorsAllowed&&s.actorId!==s.learnerId&&await verifyAdministrator(s.actorId)!==true)fail();check(c);};
   const task=(async()=>{await authority();const before=await snapshot(s,c);if(before!==await snapshot(s,c))fail();await authority();check(c);return true;})();
   active.add(task);const cleanup=()=>{active.delete(task);controllers.delete(c);c.abort();};void task.then(cleanup,cleanup);
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{c.abort();reject(Error('Formal source unavailable'));},providerTimeoutMs);});
   return await Promise.race([task,timeout]);
  }catch{c?.abort();return false;}finally{clearTimeout(timer);}
 }
 return Object.freeze({enabled:true,readSource,verifyPrivateChannel,dispose(){stopped=true;for(const c of controllers)c.abort();},async drain(){await Promise.allSettled([...active,...requests]);}});
}
