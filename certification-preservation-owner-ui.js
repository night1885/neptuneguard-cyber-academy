const id=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const ident=v=>typeof v==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(v);
const token=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const prefix='cert:preserve-shared:';
const unavailable='Review unavailable or confirmation expired. Start a fresh review. This handler did not request deletion.';
const payload=(content,components=[])=>({content,components,embeds:[],allowedMentions:{parse:[]}});
const result=(outcome,extra={})=>Object.freeze({handled:true,outcome,...extra});
// Unbound handler. No database, writer, executor, environment loader or publication.
export function createOwnerSharedReviewHandler(config={}, {sessions}={}){
  const {ownerId,guildId,database,schema,enabled=false}=config;
  if(!id(ownerId)||!id(guildId)||!ident(database)||!ident(schema)||!['begin','confirm','cancel'].every(k=>typeof sessions?.[k]==='function'))throw new Error('Explicit owner handler scope and sessions required');
  const scoped=v=>v?.guildId===guildId&&v.database===database&&v.schema===schema&&v.category==='completed_shared_enrollment'&&v.executionAuthorized===false&&id(v.subjectId)&&hash(v.snapshotSha256);
  async function say(interaction,text){const message={...payload(text),flags:64};if(interaction.deferred||interaction.replied)await interaction.followUp(message);else await interaction.reply(message);}
  return async function handleOwnerSharedReview(interaction){
    const customId=interaction.customId;
    if(interaction.isButton?.()!==true||typeof customId!=='string'||!customId.startsWith(prefix))return null;
    if(enabled!==true||interaction.user?.id!==ownerId||interaction.guildId!==guildId){await say(interaction,'Owner preservation review is unavailable or not authorized in this server.');return result('blocked');}
    if(interaction.deferred||interaction.replied){await say(interaction,unavailable);return result('unavailable');}
    const match=/^cert:preserve-shared:(open|confirm|cancel):([a-z0-9-]+)$/.exec(customId);
    if(!match||(match[1]==='open'?!id(match[2]):!token(match[2]))){await say(interaction,unavailable);return result('invalid');}
    let acknowledged=false;
    try{
      if(interaction.message?.flags?.has?.(64)===true)await interaction.deferUpdate();
      else await interaction.deferReply({flags:64});
      acknowledged=true;
      if(match[1]==='open'){
        const view=await sessions.begin(interaction.user.id,interaction.guildId,match[2]);
        if(!scoped(view)||view.outcome!=='review_pending'||view.subjectId!==match[2]||!token(view.reference)||!Number.isSafeInteger(view.courseCount)||view.courseCount<1||view.courseCount>50)throw new Error();
        const components=[{type:1,components:[{type:2,style:2,custom_id:prefix+'confirm:'+view.reference,label:'Reviewed: no preservation required'},{type:2,style:2,custom_id:prefix+'cancel:'+view.reference,label:'Cancel review'}]}];
        await interaction.editReply(payload(`Owner preservation review\nDiscord user: ${view.subjectId}\nCompleted courses: ${view.courseCount}\nSnapshot: ${view.snapshotSha256}\n\nConfirm only after reviewing preservation obligations. Required preservation or uncertainty must remain blocked. This step prepares an unsaved review intent only; it cannot issue clearance or delete records.`,components));
        return result('review_pending');
      }
      if(match[1]==='cancel'){
        const canceled=sessions.cancel(interaction.user.id,interaction.guildId,match[2]);
        if(canceled?.outcome!=='canceled'||canceled.clearanceIssued!==false||canceled.executionAuthorized!==false)throw new Error();
        await interaction.editReply(payload('Review canceled. This handler issued no clearance and requested no deletion.'));return result('canceled');
      }
      const intent=await sessions.confirm(interaction.user.id,interaction.guildId,match[2],'reviewed-no-preservation-required');
      if(!scoped(intent)||intent.outcome!=='owner_review_intent'||intent.ownerId!==ownerId||intent.reference!==match[2]||intent.clearanceIssued!==false||intent.decision!==undefined)throw new Error();
      await interaction.editReply(payload('Owner review intent prepared for this request only. It has not been saved or issued as a clearance. No deletion was requested. Clearance issuance is not connected.'));
      return result('owner_review_intent',{intent});
    }catch{
      if(acknowledged){try{await interaction.editReply(payload(unavailable));}catch{}}
      return result('unavailable');
    }
  };
}
