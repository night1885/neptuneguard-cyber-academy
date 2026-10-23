import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COMMUNITY_COURSES } from './community-learning-policy.mjs';
import { communityLearningPathChoices, assertKnownGuildCommandScope } from './community-learning-command-choices.mjs';
const script = fileURLToPath(new URL('./deploy-commands.js',import.meta.url));
const env = { ...process.env,DISCORD_TOKEN:'',CLIENT_ID:'',GUILD_ID:'',DOTENV_CONFIG_QUIET:'true' };
test('community path choices exactly match the three-course allowlist', () => {
  const choices = communityLearningPathChoices(); assert.deepEqual(choices.map(choice => choice.value),[...COMMUNITY_COURSES]);
  assert.equal(choices.length,3); for (const choice of choices) { assert.ok(choice.name.length <= 100); assert.ok(!['soc-analyst','ethical-hacking','incident-response','authorized-pentesting','security-frameworks-policy'].includes(choice.value)); }
});
test('mutating returned choices cannot change later command definitions', () => {
  const first = communityLearningPathChoices(); first[0].value = 'soc-analyst'; first.pop(); assert.equal(communityLearningPathChoices().length,3); assert.equal(communityLearningPathChoices()[0].value,'linux-fundamentals');
});
test('default and explicit dry-run serialize SDK definitions without credentials or API publication', () => {
  for (const args of [[],['--dry-run']]) {
    const output = execFileSync(process.execPath,[script,...args],{ env,encoding:'utf8' });
    const line = output.split('\n').find(value => value.startsWith('COMMUNITY_COMMANDS_DRY_RUN=')); assert.ok(line);
    const commands = JSON.parse(line.slice('COMMUNITY_COMMANDS_DRY_RUN='.length));
    assert.deepEqual(commands.map(command => command.name),['start','catalog','begin','progress','continue','badges','student-progress']);
    const begin = commands.find(command => command.name === 'begin'); assert.deepEqual(begin.options[0].choices,communityLearningPathChoices()); assert.equal(begin.options[0].required,true);
    const admin = commands.find(command => command.name === 'student-progress'); assert.equal(admin.default_member_permissions,'32');
    assert.ok(!output.includes('definitions published'));
  }
});
test('publication without credentials and ambiguous flags fail before publication', () => {
  for (const args of [['--publish'],['--publish','--dry-run'],['--unknown']]) {
    const result = spawnSync(process.execPath,[script,...args],{ env,encoding:'utf8' }); assert.notEqual(result.status,0); assert.ok(!result.stdout.includes('definitions published'));
  }
});
test('publication scope refuses unrelated names and non-slash command types', () => {
  const definitions = [{ name:'start' },{ name:'begin' }];
  assert.equal(assertKnownGuildCommandScope([{ type:1,name:'start' }],definitions),true);
  assert.throws(() => assertKnownGuildCommandScope([{ type:1,name:'unrelated-command' }],definitions));
  assert.throws(() => assertKnownGuildCommandScope([{ type:2,name:'start' }],definitions));
  assert.throws(() => assertKnownGuildCommandScope(null,definitions));
});
