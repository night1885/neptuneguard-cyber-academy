import { registrationPilotPolicy } from './certification-registration-pilot-policy.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';
import { createStatusReadGuard, StatusReadLimitError } from './certification-status-read-guard.js';
const statuses = new Map([
  ['awaiting_acknowledgment', 'Awaiting your acknowledgment'], ['pending', 'Pending admin review'],
  ['approved', 'Approved enrollment'], ['denied', 'Enrollment denied'],
  ['suspended', 'Enrollment suspended'], ['revoked', 'Enrollment revoked']
]);
const button = (custom_id, label, disabled = false) => ({ type: 2, style: 2, custom_id, label, disabled });
export function createRegistrationPilotHandlers({ readPool, writePool, config, guildId, createRegistration, createInvitation } = {}) {
  const scoped = Object.freeze({ ...config });
  const policy = registrationPilotPolicy(scoped);
  if (!policy || typeof policy.classify !== 'function' || typeof guildId !== 'string' || !/^[0-9]{17,20}$/.test(guildId) ||
      readPool === writePool || typeof readPool?.query !== 'function' || typeof writePool?.query !== 'function' ||
      typeof writePool?.connect !== 'function' || [createRegistration, createInvitation].some(fn => typeof fn !== 'function') ||
      typeof scoped.activeAgreementVersion !== 'string' || !scoped.activeAgreementVersion ||
      typeof scoped.activeAgreementSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(scoped.activeAgreementSha256)) {
    throw new Error('Explicit scoped pilot handler configuration required');
  }
  const registration = createRegistration(writePool, scoped, guildId);
  const invitation = createInvitation(writePool, scoped, guildId);
  if ([registration, invitation].some(fn => typeof fn !== 'function')) throw new Error('Pilot factories must return handlers');
  const invitations = createRegistrationInvitationReader(readPool, scoped), reads = createStatusReadGuard();
  const learner = async i => {
    if (i.guildId !== guildId || policy.classify(i) !== 'learner') {
      const payload = { content: 'This account or action is not admitted to the registration pilot.', flags: 64, embeds: [], components: [], allowedMentions: { parse: [] } };
      if (i.deferred || i.replied) await i.followUp(payload); else await i.reply(payload);
      return true;
    }
    if (i.customId.startsWith('cert:invite:')) {
      if (await invitation(i) !== true) throw new Error('Admitted pilot invitation was not handled');
      return true;
    }
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    const inPlace = i.message?.flags?.has?.(64) === true && origin === i.user.id && typeof i.deferUpdate === 'function';
    if (inPlace) await i.deferUpdate(); else await i.deferReply({ flags: 64 });
    const respond = payload => i.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
    try {
      const state = await reads.run(i.user.id, async () => {
        const result = await readPool.query('SELECT status FROM certification_enrollments WHERE discord_user_id=$1', [i.user.id]);
        if (!Array.isArray(result.rows) || result.rows.length > 1) throw new Error('Ambiguous pilot record');
        const record = result.rows[0];
        const invited = record?.status === 'awaiting_acknowledgment' && await invitations.hasPendingInvitation(i.user.id);
        return { record, invited };
      });
      const status = state.record ? statuses.get(state.record.status) || 'Admin review required' : 'Not registered';
      const next = state.invited ? 'Complete your own agreement acknowledgment, reading confirmation, comprehension answers and age-18-or-older self-declaration. Submission requests admin review only.'
        : state.record?.status === 'pending' ? 'Your request is pending. Approval and access changes are not enabled in this registration pilot.'
        : 'Contact the admin about your pilot registration. This pilot does not grant course or lab access or alter existing approval.';
      await respond({ embeds: [{ title: 'Registration pilot — My application', color: 0x3498db,
        description: i.customId === 'cert:initial:help' ? 'Use the separately approved pilot entry. Complete your own declarations; do not provide identity documents, a birth date or private contact details. Eligibility is self-declared, not independently verified.' : next,
        fields: [{ name: 'Application status', value: status }, { name: 'Course and lab access', value: 'Not enabled by this registration pilot' }, { name: 'Next step', value: next }],
        footer: { text: 'Private pilot status • Viewing this page does not change records' } }],
        components: [{ type: 1, components: [button('cert:invite:start', 'Complete invited registration', !state.invited), button('cert:initial:status', 'My application status'), button('cert:initial:help', 'Requirements / help')] }] });
    } catch (error) {
      await respond({ content: error instanceof StatusReadLimitError ? 'Pilot status checks are busy or rate limited. Wait briefly, then reopen your pilot entry.' : 'Pilot status could not be checked. No access change was requested. Contact the admin before retrying.' });
    }
    return true;
  };
  return Object.freeze({ registration, learner });
}
