import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { buildCertificationEntryPanels } from './certification-entry-panels.js';

// Explicit operator invocation only; never creates messages or runs at startup.
export async function updateCertificationEntryPanels({ client, runtime, guildId, adminChannelId, adminMessageId, studentChannelId, studentMessageId } = {}) {
  const id = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
  if (![guildId, adminChannelId, adminMessageId, studentChannelId, studentMessageId, client?.user?.id].every(id) || adminChannelId === studentChannelId) {
    throw new Error('Explicit valid guild, bot and separate admin/student message targets required');
  }
  const requireReady = () => {
    if (runtime?.enabled !== true || runtime.ready !== true) throw new Error('Certification runtime is unavailable; no further entry edits admitted');
  };
  requireReady();
  const guild = await client.guilds.fetch(guildId);
  if (guild?.id !== guildId) throw new Error('Configured guild required');
  const bot = await guild.members.fetchMe();
  const panels = buildCertificationEntryPanels(), prepared = [];
  const permissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory];
  for (const [kind, channelId, messageId] of [['admin', adminChannelId, adminMessageId], ['student', studentChannelId, studentMessageId]]) {
    const channel = await client.channels.fetch(channelId);
    if (channel?.id !== channelId || channel.guildId !== guildId || channel.type !== ChannelType.GuildText || typeof channel.messages?.fetch !== 'function') {
      throw new Error('Entry targets must be standard text channels in the configured guild');
    }
    if (channel.permissionsFor(bot)?.has(permissions) !== true) throw new Error('Required entry-channel permissions are missing');
    if (kind === 'admin' && channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel) !== false) {
      throw new Error('Admin entry channel must not be visible to everyone');
    }
    const message = await channel.messages.fetch(messageId);
    if (message?.id !== messageId || message.channelId !== channelId || message.author?.id !== client.user.id || typeof message.edit !== 'function') {
      throw new Error('Entry target must be an existing message owned by this bot');
    }
    prepared.push({ message, payload: { embeds: [], attachments: [], ...panels[kind] } });
  }
  requireReady();
  for (const { message, payload } of prepared) {
    requireReady();
    try { await message.edit(payload); }
    catch { throw new Error('Entry edit failed; earlier edits may have succeeded. Inspect both configured messages before retrying.'); }
  }
  return { adminMessageId, studentMessageId };
}
