import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
const DAY=86400000;
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const demo=x=>typeof x==='string'&&/^demo-[a-zA-Z0-9-]{1,70}$/.test(x);
const truth=x=>{x?.catch?.(()=>{});return x===true;};
// Borrowed SDK reads only. No channel creation, publication, mutation or persistence.
export function createFictionalStagingSourceReader(config={},ports={}){
 const inspected=inspectFictionalIntakeStagingProfile(config);
 if(!inspected.ok)throw Error('Invalid fictional intake staging profile');
 if(!inspected.enabled)return Object.freeze({enabled:false,latest:async()=>null,exact:async()=>null,dispose(){}});
 if(!['getClient','isReady','resolve','authorize','journalRead','verifyPrivate','now'].every(k=>typeof ports[k]==='function'))throw Error('Explicit staging source providers required');
 const profile=inspected.profile,s=profile.staging;let retired=false,pending=0,last=-1;
 const live=client=>!retired&&truth(ports.isReady())&&ports.getClient()===client&&truth(client?.isReady())&&client.user?.id===s.botId;
 const guard=client=>{if(!live(client))throw Error();};
 function clock(){const n=ports.now();if(!Number.isSafeInteger(n)||n<0||n>8640000000000000-DAY||n<last)throw Error();last=n;return n;}
 function binding(input,action){
  if(!input||input.guildId!==s.guildId||input.actorId!==s.operatorId||input.learnerId!==s.operatorId||input.action!==action||
   !uuid(input.recordId)||!demo(input.courseKey)||!demo(input.exerciseKey)||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error();
  return Object.freeze(Object.fromEntries(['recordId','guildId','actorId','learnerId','courseKey','exerciseKey','revision','action'].map(k=>[k,input[k]])));
 }
 async function authorized(b,ch,client){
  guard(client);
  const current=await ports.resolve(Object.freeze({actorId:b.actorId,guildId:b.guildId,action:b.action}));guard(client);
  if(!current||!['recordId','learnerId','courseKey','exerciseKey','revision'].every(k=>current[k]===b[k]))throw Error();
  if(await ports.authorize(b)!==true)throw Error();guard(client);
  const journal=await ports.journalRead(b);guard(client);
  if(journal?.state!=='available'||journal.channelId!==ch)throw Error();
  if(await ports.verifyPrivate(b,ch)!==true)throw Error();guard(client);
 }
 function project(m,ch,messageId){
  if(!m||!snow(m.id)||messageId!==undefined&&m.id!==messageId||m.guildId!==s.guildId||m.channelId!==ch||m.author?.id!==s.operatorId||
   m.author.bot!==false||m.webhookId!==null||m.partial!==false||m.system!==false||m.type!==0||m.reference!==null||
   m.attachments?.size!==0||m.messageSnapshots?.size!==0||m.stickers?.size!==0||!Array.isArray(m.components)||m.components.length!==0||m.poll!==null||
   typeof m.content!=='string'||!m.content.trim()||Array.from(m.content).length>2000||Buffer.byteLength(m.content,'utf8')>8192||
   !Number.isSafeInteger(m.createdTimestamp)||m.createdTimestamp<0||m.createdTimestamp>8640000000000000-DAY)throw Error();
  const at=clock();if(m.createdTimestamp>at||at>=m.createdTimestamp+DAY)throw Error();
  return Object.freeze({id:m.id,guildId:s.guildId,channelId:ch,authorId:s.operatorId,bot:false,webhook:false,
   createdAtMs:m.createdTimestamp,contentAvailable:true,content:m.content,attachmentCount:0,forwarded:false});
 }
 async function read(input,ch,messageId,action){
  if(retired||pending>=2)return null;pending++;
  try{
   const client=ports.getClient();guard(client);
   if(!snow(ch)||ch===s.entryChannelId||messageId!==undefined&&!snow(messageId))return null;
   const b=binding(input,action);await authorized(b,ch,client);
   const guild=await client.guilds.fetch({guild:s.guildId,force:true});guard(client);if(guild?.id!==s.guildId)return null;
   const channel=await guild.channels.fetch(ch,{force:true,cache:false});guard(client);
   if(channel?.id!==ch||channel.guildId!==s.guildId||channel.type!==0)return null;
   const fetched=await channel.messages.fetch(messageId===undefined?{limit:1,cache:false}:{message:messageId,force:true,cache:false});guard(client);
   let message=fetched;
   if(messageId===undefined){if(fetched?.size!==1||typeof fetched.values!=='function')return null;message=fetched.values().next().value;}
   const result=project(message,ch,messageId);
   await authorized(b,ch,client);guard(client);
   if(clock()>=result.createdAtMs+DAY)return null;
   return result;
  }catch{return null;}finally{pending--;}
 }
 return Object.freeze({enabled:true,latest:(b,ch)=>read(b,ch,undefined,'preview'),exact:(b,ch,id)=>snow(id)?read(b,ch,id,'submit'):Promise.resolve(null),dispose(){retired=true;}});
}
