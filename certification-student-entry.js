import { initialConsoleEntry } from './certification-initial-console.js';

const eligibleEntries = new WeakSet();

export function withStudentEntry(interaction, guildId, ready) {
  if (!ready || !interaction.isChatInputCommand?.() || interaction.commandName !== 'start' || interaction.guildId !== guildId) return interaction;
  const wrapped = new Proxy(interaction, {
    get(original, key) {
      if (key === 'editReply') return payload => {
        // Retain legacy behavior until the successful /start handler is migrated.
        if (typeof payload?.content === 'string' && payload.content.startsWith('## Welcome to NeptuneGuard Cyber Academy\n') && payload.content.includes('Your learner profile is ready.') && !payload.components?.length) {
          payload = { ...payload, components: [initialConsoleEntry()], allowedMentions: { parse: [] } };
        }
        return original.editReply(payload);
      };
      const value = Reflect.get(original, key, original);
      return typeof value === 'function' ? value.bind(original) : value;
    }
  });
  eligibleEntries.add(wrapped);
  return wrapped;
}

// Invoke only after successful /start prerequisite and profile checks.
export function replyStudentStart(interaction, payload) {
  if (eligibleEntries.has(interaction) && !payload.components?.length) {
    payload = { ...payload, components: [initialConsoleEntry()], allowedMentions: { parse: [] } };
  }
  return interaction.editReply(payload);
}
