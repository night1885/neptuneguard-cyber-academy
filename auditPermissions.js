// NeptuneGuard Cyber Academy - Admin channel permission audit (discord.js v14)
// Use as a slash command module (/audit-permissions) OR run standalone:
//   DISCORD_TOKEN=xxx node auditPermissions.js
const {
  SlashCommandBuilder, PermissionFlagsBits: P, EmbedBuilder, Client, GatewayIntentBits,
} = require('discord.js');

const CONFIG = {
  guildId: '1330353166830665859',
  adminChannelId: '1339276399390887956',
  ownerId: '1223123544301633567',
  // Role names (case-insensitive). Edit to match your server.
  staffRoles: ['Admin', 'Staff', 'Moderator'],
  restrictedRoles: ['Student', 'Pending Guardian Consent', 'Lab Access'],
};

const STAFF_NEEDS = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory];
const BOT_NEEDS = [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory];
const name = (bit) => Object.keys(P).find((k) => P[k] === bit);
const lc = (a) => a.map((s) => s.toLowerCase());

async function audit(guild) {
  const fail = [], warn = [], pass = [];
  const ch = await guild.channels.fetch(CONFIG.adminChannelId).catch(() => null);
  if (!ch) return { fail: [`Admin channel ${CONFIG.adminChannelId} not found`], warn, pass };
  await guild.roles.fetch();
  const me = await guild.members.fetchMe();

  // 1. @everyone must not see the channel
  if (ch.permissionsFor(guild.roles.everyone).has(P.ViewChannel)) fail.push('@everyone can VIEW the admin channel');
  else pass.push('@everyone cannot view the channel');

  // 2. Category sync
  if (ch.parent) {
    (ch.permissionsLocked ? warn : pass).push(ch.permissionsLocked
      ? `Synced to category "${ch.parent.name}" - category changes will affect this channel`
      : `Not synced to category "${ch.parent.name}" (custom overwrites)`);
  }

  // 3. Bot permissions
  const botPerms = ch.permissionsFor(me);
  const botMissing = BOT_NEEDS.filter((b) => !botPerms.has(b)).map(name);
  botMissing.length ? fail.push(`Bot missing: ${botMissing.join(', ')}`) : pass.push('Bot has required permissions');

  const staff = lc(CONFIG.staffRoles), restricted = lc(CONFIG.restrictedRoles);
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.id || role.managed) continue;
    const perms = ch.permissionsFor(role);
    const n = role.name.toLowerCase();

    // 4. Administrator on any non-staff role bypasses all channel overwrites
    if (role.permissions.has(P.Administrator) && !staff.includes(n))
      fail.push(`Role "${role.name}" has ADMINISTRATOR (bypasses channel permissions)`);

    if (staff.includes(n)) {
      const miss = STAFF_NEEDS.filter((b) => !perms.has(b)).map(name);
      miss.length ? fail.push(`Staff role "${role.name}" missing: ${miss.join(', ')}`)
        : pass.push(`Staff role "${role.name}" OK`);
    } else if (perms.has(P.ViewChannel)) {
      (restricted.includes(n) ? fail : warn).push(`Role "${role.name}" can VIEW the admin channel`);
    }
  }
  for (const r of CONFIG.staffRoles)
    if (!guild.roles.cache.some((x) => x.name.toLowerCase() === r.toLowerCase())) warn.push(`Staff role "${r}" not found`);

  // 5. Member-specific overwrites
  for (const ow of ch.permissionOverwrites.cache.values()) {
    if (ow.type !== 1 || ow.id === CONFIG.ownerId || ow.id === me.id) continue;
    if (ow.allow.has(P.ViewChannel)) warn.push(`Member <@${ow.id}> has a direct View overwrite`);
  }
  return { fail, warn, pass };
}

function toEmbed({ fail, warn, pass }) {
  const list = (a) => (a.length ? a.map((s) => `• ${s}`).join('\n').slice(0, 1024) : 'None');
  return new EmbedBuilder()
    .setTitle('Admin Channel Permission Audit')
    .setColor(fail.length ? 0xd9363e : warn.length ? 0xe5a00d : 0x2e9e5b)
    .addFields(
      { name: `Failures (${fail.length})`, value: list(fail) },
      { name: `Warnings (${warn.length})`, value: list(warn) },
      { name: `Passed (${pass.length})`, value: list(pass) },
    ).setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('audit-permissions')
    .setDescription('Audit admin channel permissions (owner only)')
    .setDefaultMemberPermissions(P.Administrator),
  async execute(interaction) {
    if (interaction.user.id !== CONFIG.ownerId)
      return interaction.reply({ content: 'Owner only.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const guild = await interaction.client.guilds.fetch(CONFIG.guildId);
    await interaction.editReply({ embeds: [toEmbed(await audit(guild))] });
  },
  audit, CONFIG,
};

// Standalone mode
if (require.main === module) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('ready', async () => {
    const r = await audit(await client.guilds.fetch(CONFIG.guildId));
    for (const [k, v] of Object.entries(r)) console.log(`\n${k.toUpperCase()}:\n` + (v.map((s) => '  - ' + s).join('\n') || '  none'));
    client.destroy();
    process.exit(r.fail.length ? 1 : 0);
  });
  client.login(process.env.DISCORD_TOKEN);
}
