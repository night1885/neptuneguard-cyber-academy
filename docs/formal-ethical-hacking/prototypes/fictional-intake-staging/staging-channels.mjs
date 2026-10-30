const V=1024n,S=2048n,H=65536n,MC=16n,MM=8192n;
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const denied=()=>Error('Staging channel operation unavailable');
export function createStagingChannels({profile,reviewerId,store,getResources,isReady,now=Date.now}){
 const s=profile.staging,allowed=new Set([s.botId,s.operatorId,reviewerId]);let closed=false;
 function live(){const client=getResources()?.client;if(closed||isReady()!==true||client?.isReady()!==true||client.user?.id!==s.botId)throw denied();return client;}
 function expected(admitted){return new Map([[s.guildId,{type:0,allow:0n,deny:V|S|H}],[s.botId,{type:1,allow:V|S|H|MC|MM,deny:0n}],[reviewerId,{type:1,allow:V|H,deny:0n}],[s.operatorId,{type:1,allow:admitted?V|S|H:0n,deny:admitted?0n:V|S|H}]]);}
 async function guildAudit(){
  const client=live(),g=await client.guilds.fetch({guild:s.guildId,force:true});live();
  if(g?.id!==s.guildId||g.ownerId!==reviewerId||!Number.isInteger(g.memberCount)||g.memberCount<3||g.memberCount>50)throw denied();
  await g.roles.fetch();const members=await g.members.list({limit:1000,cache:false});live();
  if(members.size!==g.memberCount||![...allowed].every(id=>members.has(id))||members.get(s.botId).user?.bot!==true||members.get(s.operatorId).user?.bot!==false||members.get(reviewerId).user?.bot!==false)throw denied();
  for(const member of members.values()){
   if(member.guild?.id!==s.guildId)throw denied();
   if(!allowed.has(member.id)&&['Administrator','ManageRoles','ManageChannels','ManageWebhooks'].some(p=>member.permissions.has(p)))throw denied();
   if(member.id===s.operatorId&&['Administrator','ManageRoles','ManageChannels','ManageWebhooks'].some(p=>member.permissions.has(p)))throw denied();
  }
  if(!members.get(s.botId).permissions.has('ManageChannels'))throw denied();return {g,members};
 }
 async function physical(ch){
  if(!snow(ch)||ch===s.entryChannelId)throw denied();const {g,members}=await guildAudit();const channel=await g.channels.fetch(ch,{force:true,cache:false});live();
  if(channel?.id!==ch||channel.guildId!==s.guildId||channel.type!==0||channel.parentId!==null)throw denied();
  const all=channel.permissionOverwrites.cache;if(all.size!==4)throw denied();
  const learner=all.get(s.operatorId),admitted=learner?.allow.bitfield===(V|S|H)&&learner?.deny.bitfield===0n;
  for(const [id,e]of expected(admitted)){const a=all.get(id);if(!a||a.type!==e.type||a.allow.bitfield!==e.allow||a.deny.bitfield!==e.deny)throw denied();}
  for(const m of members.values()){
   const p=channel.permissionsFor(m);if(!p)throw denied();
   if(!allowed.has(m.id)&&p.has('ViewChannel'))throw denied();
   if(m.id===s.operatorId&&p.has('ViewChannel')!==admitted)throw denied();
   if(m.id===s.botId&&!['ViewChannel','ReadMessageHistory','SendMessages','ManageMessages'].every(x=>p.has(x)))throw denied();
  }
  return {channel,admitted};
 }
 function bound(b){if(b?.guildId!==s.guildId||b.learnerId!==s.operatorId||b.actorId!==s.operatorId)throw denied();}
 async function verifyPrivate(b,ch){try{bound(b);if(await store.authorize(b)!==true)return false;const j=await store.journalRead(b);if(!['verify-pending','available'].includes(j?.state)||j.channelId!==ch)return false;const r=await physical(ch);return j.state!=='available'||r.admitted;}catch{return false;}}
 return Object.freeze({auditGuild:async()=>{await guildAudit();return true;},verifyPrivate,
  async createRestricted(b,p){bound(b);if(p?.learnerAccess!==false||typeof p.operationId!=='string'||await store.authorize(b)!==true)throw denied();const j=await store.journalRead(b);if(j?.state!=='creating'||j.operationId!==p.operationId)throw denied();
   const {g}=await guildAudit();const channel=await g.channels.create({name:'fictional-intake',type:0,parent:null,permissionOverwrites:[...expected(false)].map(([id,x])=>({id,type:x.type,allow:x.allow,deny:x.deny})),reason:'Explicit fictional staging intake'});live();
   if(!snow(channel?.id)||channel.guildId!==s.guildId)throw denied();return Object.freeze({id:channel.id,guildId:s.guildId});},
  async admitLearner(b,ch){if(await verifyPrivate(b,ch)!==true)throw denied();const j=await store.journalRead(b);if(j?.state!=='verify-pending')throw denied();const {channel}=await physical(ch);await channel.permissionOverwrites.edit(s.operatorId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});live();if(!(await physical(ch)).admitted)throw denied();},
  async scanDraftMetadata(control={}){const guard=()=>{live();if(control.isCancelled?.()===true)throw denied();};guard();const j=await store.maintenance();guard();if(j?.state!=='available')return {complete:j?.state==='unprovisioned'||j?.state==='erased',observed:0};const {channel}=await physical(j.channelId);guard();if(!Number.isSafeInteger(j.expiresAtMs))throw denied();if(now()>=j.expiresAtMs){await channel.permissionOverwrites.edit(s.operatorId,{ViewChannel:false,SendMessages:false,ReadMessageHistory:false});guard();if((await physical(j.channelId)).admitted)throw denied();}guard();let before,observed=0;
   for(let page=0;page<10;page++){
    const rows=await channel.messages.fetch({limit:100,cache:false,...(before?{before}:{})});guard();if(rows.size>100)throw denied();
    for(const m of rows.values())if(m.guildId===s.guildId&&m.channelId===j.channelId&&m.author?.id===s.operatorId&&m.author.bot===false&&m.webhookId===null&&snow(m.id)&&Number.isSafeInteger(m.createdTimestamp)){
     guard();await store.noteDraft({channelId:j.channelId,messageId:m.id,createdAtMs:m.createdTimestamp});guard();observed++;
    }
    if(rows.size<100){guard();if(now()>=j.expiresAtMs)await store.retireJournal();guard();return {complete:true,observed};}const last=[...rows.values()].at(-1);if(!last||last.id===before)throw denied();before=last.id;
   }return {complete:false,observed};},
  async deleteDueSource(item,control={}){const guard=()=>{live();if(control.isCancelled?.()===true)throw denied();};guard();if(!snow(item?.channelId)||!snow(item.messageId)||!Number.isSafeInteger(item.deadlineMs)||now()<item.deadlineMs)throw denied();const {channel}=await physical(item.channelId);guard();
   try{await channel.messages.delete(item.messageId);guard();return {deleted:true};}catch(e){guard();if(e?.code===10008)return {deleted:true};return {deleted:false};}},
  dispose(){closed=true;}
 });
}
