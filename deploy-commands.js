import 'dotenv/config';
import {
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

const requiredVariables = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID'
];

for (const variableName of requiredVariables) {
  if (!process.env[variableName]) {
    throw new Error(`Missing ${variableName} in .env`);
  }
}

const instructorPermission =
  PermissionsBitField.Flags.ManageGuild;

const learningPaths = [
  {
    name: 'Linux Fundamentals',
    value: 'linux-fundamentals'
  },
  {
    name: 'Linux Administration',
    value: 'linux-administration'
  },
  {
    name: 'Linux Security Engineering',
    value: 'linux-security-engineering'
  },
  {
    name: 'SOC Analyst',
    value: 'soc-analyst'
  },
  {
    name: 'Security Frameworks and Policy',
    value: 'security-frameworks-policy'
  },
  {
    name: 'Authorized Pentesting',
    value: 'authorized-pentesting'
  }
];

const commands = [
  new SlashCommandBuilder()
    .setName('start')
    .setDescription(
      'Open the NeptuneGuard Cyber Academy learner dashboard.'
    ),

  new SlashCommandBuilder()
    .setName('catalog')
    .setDescription(
      'Browse NeptuneGuard Cyber Academy learning paths.'
    ),

  new SlashCommandBuilder()
    .setName('begin')
    .setDescription('Begin a learning path.')
    .addStringOption(option =>
      option
        .setName('path')
        .setDescription('Choose a learning path.')
        .setRequired(true)
        .addChoices(...learningPaths)
    ),

  new SlashCommandBuilder()
    .setName('progress')
    .setDescription(
      'View your private NeptuneGuard learning progress.'
    ),

  new SlashCommandBuilder()
    .setName('continue')
    .setDescription(
      'Continue your current NeptuneGuard learning path.'
    ),

  new SlashCommandBuilder()
    .setName('badges')
    .setDescription(
      'View your NeptuneGuard Cyber Academy badges.'
    ),

  new SlashCommandBuilder()
    .setName('student-progress')
    .setDescription(
      'View a learner progress summary.'
    )
    .setDefaultMemberPermissions(instructorPermission)
    .addUserOption(option =>
      option
        .setName('member')
        .setDescription('Member whose progress you want to review.')
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registering NeptuneGuard commands...');

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );

  console.log(
    'NeptuneGuard commands registered successfully.'
  );
} catch (error) {
  console.error('Command registration failed:', error);
  process.exitCode = 1;
}