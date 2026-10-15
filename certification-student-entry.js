import { initialConsoleEntry } from './certification-initial-console.js';

export function withStudentEntry(interaction, guildId, ready) {
  if (!ready || !interaction.isChatInputCommand?.() || interaction.commandName !== 'start' || interaction.guildId !== guildId) return interaction;
  return new Proxy(interaction, {
    get(original, key) {
      if (key === 'editReply') return payload => {
        if (typeof payload?.content === 'string' && payload.content.startsWith('## Welcome to NeptuneGuard Cyber Academy\n') && payload.content.includes('Your learner profile is ready.') && !payload.components?.length) {
          payload = { ...payload, components: [initialConsoleEntry()], allowedMentions: { parse: [] } };
        }
        return original.editReply(payload);
      };
      const value = Reflect.get(original, key, original);
      return typeof value === 'function' ? value.bind(original) : value;
    }
  });
}
