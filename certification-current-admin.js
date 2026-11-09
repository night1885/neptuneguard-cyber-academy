import { PermissionFlagsBits } from 'discord.js';

const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);

export function createCurrentAdministratorVerifier(client, guildId) {
  if (!validId(guildId) || typeof client?.guilds?.fetch !== 'function') throw new Error('Explicit Discord client and server required');
  return async function isCurrentAdministrator(actorId) {
    if (!validId(actorId)) return false;
    try {
      const guild = await client.guilds.fetch({ guild: guildId, force: true });
      if (guild?.id !== guildId) return false;
      const member = await guild.members.fetch({ user: actorId, force: true, cache: false });
      if (member?.id !== actorId || member.guild?.id !== guildId) return false;
      await guild.roles.fetch();
      return member.permissions.has(PermissionFlagsBits.Administrator) === true;
    } catch {
      return false;
    }
  };
}
