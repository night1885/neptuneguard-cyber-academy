import 'dotenv/config';
import { PermissionsBitField, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { communityLearningPathChoices, assertKnownGuildCommandScope } from './community-learning-command-choices.mjs';
const flags = process.argv.slice(2);
if (flags.some(flag => !['--dry-run','--publish'].includes(flag)) || (flags.includes('--dry-run') && flags.includes('--publish'))) throw new Error('Choose either --dry-run or --publish');
const publish = flags.includes('--publish');
if (publish) for (const variable of ['DISCORD_TOKEN','CLIENT_ID','GUILD_ID']) {
  if (!process.env[variable]) throw new Error(`Missing ${variable} for explicit command publication`);
}
const commands = [
  new SlashCommandBuilder().setName('start').setDescription('Open NeptuneGuard Community Learning for verified members.'),
  new SlashCommandBuilder().setName('catalog').setDescription('Browse the three Linux community learning paths.'),
  new SlashCommandBuilder().setName('begin').setDescription('Begin a Linux community learning path.').addStringOption(option =>
    option.setName('path').setDescription('Choose a Linux community learning path.').setRequired(true).addChoices(...communityLearningPathChoices())),
  new SlashCommandBuilder().setName('progress').setDescription('View your private Linux community learning progress.'),
  new SlashCommandBuilder().setName('continue').setDescription('Continue your selected Linux community learning path.'),
  new SlashCommandBuilder().setName('badges').setDescription('View your Linux community learning badges.'),
  new SlashCommandBuilder().setName('student-progress').setDescription('View a learner progress summary.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild).addUserOption(option =>
      option.setName('member').setDescription('Member whose progress you want to review.').setRequired(true))
].map(command => command.toJSON());
if (!publish) {
  console.log('COMMUNITY_COMMANDS_DRY_RUN=' + JSON.stringify(commands));
} else {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    const route = Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID);
    const existing = await rest.get(route);
    assertKnownGuildCommandScope(existing,commands);
    await rest.put(route,{ body: commands });
    console.log('NeptuneGuard guild command definitions published. Runtime activation remains separate.');
  } catch {
    console.error('Guild command publication failed; inspect the current command list before retrying.');
    process.exitCode = 1;
  }
}
