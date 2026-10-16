import { createGuardedSubmissionHandler } from './certification-submission-guarded.js';

export function invitationPayload(value) {
  if (value === null || typeof value !== 'object') return value;
  if (typeof value.toJSON === 'function') return invitationPayload(value.toJSON());
  if (Array.isArray(value)) return value.map(invitationPayload);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'custom_id' && typeof item === 'string' ? item.replace(/^cert:submit:/, 'cert:invite:') : invitationPayload(item)]));
}

export function createInvitationInteractionHandler(pool, config, guildId) {
  const handle = createGuardedSubmissionHandler(pool, config, guildId, { invitedOnly: true });
  return async function routeInvitation(interaction) {
    const id = interaction.customId || '';
    if (!(interaction.isButton?.() || interaction.isModalSubmit?.()) || !id.startsWith('cert:invite:')) return false;
    if (!/^cert:invite:(?:start|(?:previous|next|form|send|cancel):[a-f0-9-]{36})$/.test(id)) {
      await interaction.reply({ content: 'Invalid invitation action. Reopen your registration console.', flags: 64, allowedMentions: { parse: [] } }); return true;
    }
    const adapter = new Proxy(interaction, {
      get(original, key) {
        if (key === 'customId') return id.replace(/^cert:invite:/, 'cert:submit:');
        if (['reply', 'editReply', 'showModal'].includes(key)) return payload => original[key](invitationPayload(payload));
        const value = Reflect.get(original, key, original);
        return typeof value === 'function' ? value.bind(original) : value;
      }
    });
    return handle(adapter);
  };
}
