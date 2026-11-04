const denied=()=>Object.freeze({ok:false,operationalReady:false,issue:'Staging resource verification unavailable'});
const identitySql="SELECT current_database() AS database_name,current_user AS role_name,(SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) AS elevated";
// Input is the frozen, validated profile returned by the staging profile inspector.
// Explicit one-shot inspection only; never logs in, opens a pool, publishes or mutates.
export function createFictionalStagingResourceVerifier(profile,resources,expectedRole){
 if(!profile||profile.mode!=='fictional-intake-staging'||profile.fictionalReportsOnly!==true||
  !Object.isFrozen(profile)||!Object.isFrozen(profile.staging)||!Object.isFrozen(profile.production)||
  typeof expectedRole!=='string'||!/^[a-z][a-z0-9_]{0,62}$/.test(expectedRole))throw Error('Explicit validated staging profile and role required');
 const {client,pool}=resources??{};
 if(typeof client?.isReady!=='function'||typeof client?.guilds?.fetch!=='function'||typeof pool?.query!=='function')throw Error('Explicit staging inspection resources required');
 let retired=false;
 const current=()=>!retired&&client.isReady()===true&&client.user?.id===profile.staging.botId&&client.user.id!==profile.production.botId;
 return Object.freeze({
  async inspect(){
   try{
    if(!current())return denied();
    const s=profile.staging;
    if(s.guildId===profile.production.guildId||!s.database?.name)return denied();
    const guild=await client.guilds.fetch({guild:s.guildId,force:true});
    if(!current()||guild?.id!==s.guildId)return denied();
    await guild.roles.fetch();if(!current())return denied();
    const bot=await guild.members.fetch({user:s.botId,force:true});
    if(!current()||bot?.id!==s.botId||bot.guild?.id!==s.guildId||bot.user?.bot!==true)return denied();
    const operator=await guild.members.fetch({user:s.operatorId,force:true});
    if(!current()||operator?.id!==s.operatorId||operator.guild?.id!==s.guildId||operator.user?.bot!==false)return denied();
    const entry=await guild.channels.fetch(s.entryChannelId,{force:true});
    if(!current()||entry?.id!==s.entryChannelId||entry.guildId!==s.guildId||entry.type!==0)return denied();
    const botPermissions=entry.permissionsFor(bot),operatorPermissions=entry.permissionsFor(operator);
    if(!['ViewChannel','SendMessages','ReadMessageHistory'].every(p=>botPermissions?.has(p)===true)||operatorPermissions?.has('ViewChannel')!==true)return denied();
    const result=await pool.query(identitySql),rows=result?.rows;
    if(!current()||!Array.isArray(rows)||rows.length!==1||rows[0].database_name!==s.database.name||rows[0].role_name!==expectedRole||rows[0].elevated!==false)return denied();
    return Object.freeze({ok:true,operationalReady:false,checks:Object.freeze({botIdentity:true,guildIdentity:true,operatorMembership:true,entryAccess:true,databaseName:true,databaseRole:true,nonElevatedRole:true})});
   }catch{return denied();}
  },
  close(){retired=true;}
 });
}
