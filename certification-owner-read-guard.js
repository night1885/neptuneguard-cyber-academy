import { createStatusReadGuard, StatusReadLimitError } from './certification-status-read-guard.js';
import { observeSubmissionOperation } from './certification-submission-deadline.js';

export function createGuardedOwnerReads(route, config, guildId, { responseTimeoutMs = 10000, limit = 60, now = Date.now } = {}) {
  if (typeof route !== 'function' || !Number.isInteger(responseTimeoutMs) || responseTimeoutMs < 1 || responseTimeoutMs > 60000) throw new Error('Invalid owner-read configuration');
  const guard = createStatusReadGuard({ limit, now });
  return async function guardedOwnerRead(interaction) {
    const id = interaction.customId || '';
    const read = (interaction.isButton() && (id.startsWith('cert:console:') || /^cert:admin:(overview|enrollments|labs):\d{1,6}$/.test(id) || id.startsWith('cert:students:') || id.startsWith('cert:enrollment:review:'))) ||
      (interaction.isStringSelectMenu?.() === true && id === 'cert:console:section') || (interaction.isModalSubmit() && id === 'cert:owner:lookup:submit');
    if (!read || config.enabled !== true || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) return route(interaction);
    let expired = false;
    const notify = content => {
      const payload = { content, embeds: [], components: [], allowedMentions: { parse: [] } };
      return interaction.deferred || interaction.replied ? interaction.editReply(payload) : interaction.reply({ flags: 64, ...payload });
    };
    const proxy = new Proxy(interaction, { get(target, property) {
      const value = Reflect.get(target, property, target);
      if (['reply', 'editReply', 'deferReply', 'showModal'].includes(property) && typeof value === 'function') return (...args) => expired ? Promise.resolve() : value.apply(target, args);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    try {
      const observed = await observeSubmissionOperation(guard.run(interaction.user.id, () => route(proxy)), async () => {
        expired = true; await notify('This owner lookup is taking longer than expected. Its result is not confirmed. Wait before refreshing; the response timeout does not cancel database work. No record was changed by this read.');
      }, responseTimeoutMs);
      return observed.timedOut ? true : observed.value;
    } catch (error) {
      if (!(error instanceof StatusReadLimitError)) throw error;
      await notify(error.reason === 'busy' ? 'Another owner lookup is still processing. Wait for it to finish before refreshing.' : error.reason === 'rate_limit' ? 'Too many owner lookups. Wait up to one minute before refreshing.' : 'Owner lookups are busy. Retry later.');
      return true;
    }
  };
}
