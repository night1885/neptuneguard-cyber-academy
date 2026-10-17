import { createCertificationSubmissionHandler } from './certification-submission-interactions.js';
import { createSubmissionAttemptGuard } from './certification-submission-attempts.js';
import { observeSubmissionOperation } from './certification-submission-deadline.js';
import { handleEnrollmentStatus } from './certification-enrollment-status.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';

export function createGuardedSubmissionHandler(pool, config, guildId, { responseTimeoutMs = 10000, invitedOnly = false } = {}) {
  if (!Number.isInteger(responseTimeoutMs) || responseTimeoutMs < 1 || responseTimeoutMs > 60000) throw new Error('Invalid response deadline');
  const handler = createCertificationSubmissionHandler(pool, config, guildId, { invitedOnly });
  const guard = createSubmissionAttemptGuard();
  const statusGuard = createStatusReadGuard();
  return async function guardedSubmission(interaction) {
    if (!(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId?.startsWith('cert:submit:')) return false;
    if (interaction.isButton() && /^cert:submit:status(?::|$)/.test(interaction.customId)) {
      const guardedPool = { query: (...args) => statusGuard.run(interaction.user?.id, () => pool.query(...args)) };
      return handleEnrollmentStatus(interaction, guardedPool, config, guildId, responseTimeoutMs);
    }
    if (config.enabled !== true || (!invitedOnly && config.enrollmentSubmissionEnabled !== true) ||
        interaction.guildId !== guildId || !/^\d{17,20}$/.test(interaction.user?.id || '')) return handler(interaction);
    const match = /^cert:submit:(previous|next|form|send|cancel):([a-f0-9-]{36})$/.exec(interaction.customId);
    let action;
    if (interaction.customId === 'cert:submit:start' && interaction.isButton()) action = 'start';
    else if (match && ((match[1] === 'send' && interaction.isModalSubmit()) ||
        (match[1] !== 'send' && interaction.isButton()))) {
      action = ['previous', 'next'].includes(match[1]) ? 'navigate' : match[1];
    } else return handler(interaction);
    const notify = async content => {
      const payload = { content, allowedMentions: { parse: [] }, components: [], embeds: [] };
      if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
      else await interaction.reply({ flags: 64, ...payload });
    };
    let expired = false;
    const guardedInteraction = new Proxy(interaction, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (['reply', 'editReply', 'deferReply', 'showModal'].includes(property) && typeof value === 'function') {
          return (...args) => expired ? Promise.resolve() : value.apply(target, args);
        }
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    const processing = guard.run(interaction.user.id, action, () => handler(guardedInteraction));
    const observed = await observeSubmissionOperation(processing, async () => {
      expired = true;
      await notify('This enrollment action is taking longer than expected. Its outcome is not confirmed. Do not resubmit yet; ask the admin to check your enrollment status. This response timeout does not cancel database work or grant access.');
    }, responseTimeoutMs);
    if (observed.timedOut) return true;
    const result = observed.value;
    if (result.allowed) return result.value;
    await notify(result.reason === 'busy'
      ? 'Another enrollment action is still processing. Wait for it to finish before retrying.'
      : result.reason === 'rate_limit'
        ? `Too many enrollment attempts. Retry in ${Math.ceil(result.retryAfterMs / 1000)} seconds.`
        : 'Enrollment is busy. Retry later.');
    return true;
  };
}
