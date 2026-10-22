import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsoleSettings } from './certification-console-settings.js';
import { ownerCurrentQuestionGuide } from './certification-manual-review-owner-guide.mjs';
import { createManualReviewSnapshot } from './certification-manual-review-data.mjs';
const owner='222222222222222222', learner='111111111111111111', guild='333333333333333333';
const config={enabled:true,manualReviewEnabled:true,ownerId:owner,activeAgreementVersion:'agreement-v1',
  activeAgreementSha256:'a'.repeat(64),comprehensionCheck:{version:'check-v1',questions:[{prompt:'Question text?'}],correctAnswers:['Private guide']}};
function interaction(id, actor=owner, actualGuild=guild) {
  const replies=[];
  return {customId:id,user:{id:actor},guildId:actualGuild,replies,isButton:()=>true,
    async deferReply(payload){assert.equal(payload.flags,64);},
    async reply(payload){replies.push(payload);},async editReply(payload){replies.push(payload);}};
}
test('settings shows current guide privately to owner',async()=>{
  const i=interaction('cert:console:settings');
  assert.equal(await handleConsoleSettings(i,config,guild),true);
  assert.equal(i.replies[0].embeds.length,2);
  assert.match(JSON.stringify(i.replies[0].embeds[1]),/Private guide/);
  assert.deepEqual(i.replies[0].allowedMentions,{parse:[]});
});
test('settings denies learner without revealing guide',async()=>{
  const i=interaction('cert:console:settings',learner);
  await handleConsoleSettings(i,config,guild);
  assert.equal(i.replies[0].flags,64);
  assert.doesNotMatch(JSON.stringify(i.replies),/Private guide|Question text/);
});
test('settings denies owner in another guild',async()=>{
  const i=interaction('cert:console:settings',owner,'444444444444444444');
  await handleConsoleSettings(i,config,guild);
  assert.doesNotMatch(JSON.stringify(i.replies),/Private guide|Question text/);
});
test('settings preserves original single embed when manual mode is off',async()=>{
  const i=interaction('cert:console:settings');
  await handleConsoleSettings(i,{...config,manualReviewEnabled:false},guild);
  assert.equal(i.replies[0].embeds.length,1);
  assert.doesNotMatch(JSON.stringify(i.replies),/Private guide/);
});
test('guide labels configuration as guidance, never as learner submission',()=>{
  const embed=ownerCurrentQuestionGuide(config,owner,guild,guild);
  assert.equal(embed.fields.length,2);
  assert.match(embed.description,/not a learner submission/);
  assert.equal(embed.fields.some(f=>f.name.includes('Learner response')),false);
});
test('guide remains bounded for three maximum-length questions',()=>{
  const settings={...config,comprehensionCheck:{version:'check-v1',questions:[1,2,3].map(()=>({prompt:'*'.repeat(300)})),correctAnswers:[1,2,3].map(()=>'*'.repeat(100))}};
  const embed=ownerCurrentQuestionGuide(settings,owner,guild,guild);
  assert.equal(embed.fields.length,6);
  assert.ok(embed.fields.every(f=>f.value.length<=1024));
});
test('student record shows captured response and guide using read-only queries',async()=>{
  const {handleConsoleStudent}=await import('./certification-console-student.js');
  const snapshot=createManualReviewSnapshot(config,['Learner response']);
  const record={discord_user_id:learner,status:'pending',signature_method:'discord_account',agreement_version:'agreement-v1',
    agreement_content_sha256:'a'.repeat(64),comprehension_check_version:'check-v1',acknowledged_at:new Date(),learner_confirmed_read_at:new Date(),
    age_eligible:true,age_declared_at:new Date(),age_declaration_version:'adult-18-v1',comprehension_passed_at:null};
  const queries=[];
  const pool={async query(sql){queries.push(sql);if(sql.startsWith('SELECT comprehension_submitted_at'))return{rows:[{comprehension_submitted_at:new Date(),comprehension_review_snapshot:snapshot}]};
    if(sql.includes('COUNT(*)'))return{rows:[{total:0}]};return{rows:[{...record}]};}};
  const i=interaction(`cert:students:detail:${learner}`);
  const changedConfig={...config,comprehensionCheck:{...config.comprehensionCheck,correctAnswers:['Changed current guide']}};
  await handleConsoleStudent(i,pool,changedConfig,guild);
  assert.equal(i.replies[0].embeds.length,2);
  assert.match(JSON.stringify(i.replies[0].embeds[1]),/Learner response/);
  assert.match(JSON.stringify(i.replies[0].embeds[1]),/Private guide/);
  assert.doesNotMatch(JSON.stringify(i.replies[0].embeds[1]),/Changed current guide/);
  assert.ok(queries.every(sql=>sql.startsWith('SELECT')));
});
test('student record rejects learner before reading private responses',async()=>{
  const {handleConsoleStudent}=await import('./certification-console-student.js');
  let reads=0;const pool={async query(){reads++;throw new Error('Must not query');}};
  const i=interaction(`cert:students:detail:${learner}`,learner);
  await handleConsoleStudent(i,pool,config,guild);
  assert.equal(reads,0);
  assert.doesNotMatch(JSON.stringify(i.replies),/Private guide|Learner response/);
});
