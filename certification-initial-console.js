import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createCertificationService } from './certification-service.js';
import { createStatusReadGuard, StatusReadLimitError } from './certification-status-read-guard.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';
import { createInvitationInteractionHandler } from './certification-invitation-interactions.js';
const button = (id, label, disabled = false) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
const labels = { awaiting_acknowledgment: 'Awaiting your acknowledgment', pending: 'Pending admin review', approved: 'Approved enrollment', denied: 'Enrollment denied', suspended: 'Enrollment suspended', revoked: 'Enrollment revoked' };
export function initialConsoleEntry() {
  return new ActionRowBuilder().addComponents(button('cert:initial:home', 'Registration / application console'), button('cert:learner:home', 'Approved student panel'));
}
function invitationFormConfigured(config) {
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
  const check = config.comprehensionCheck;
  return identifier(config.activeAgreementVersion) && typeof config.activeAgreementSha256 === 'string' && /^[a-f0-9]{64}$/.test(config.activeAgreementSha256) &&
    identifier(check?.version) && Array.isArray(check?.questions) && check.questions.length >= 1 && check.questions.length <= 3 &&
    check.questions.every(question => typeof question?.prompt === 'string' && question.prompt.trim().length > 0 && question.prompt.length <= 300) &&
    Array.isArray(check.correctAnswers) && check.correctAnswers.length === check.questions.length &&
    check.correctAnswers.every(answer => typeof answer === 'string' && answer.trim().length > 0 && answer.length <= 100);
}
export function createInitialConsoleHandler(pool, config, guildId) {
  const service = createCertificationService(pool, config);
  const guard = createStatusReadGuard();
  const invitations = createRegistrationInvitationReader(pool, config);
  const invitationFlow = createInvitationInteractionHandler(pool, config, guildId);
  return async function handleInitialConsole(interaction) {
    if (await invitationFlow(interaction)) return true;
    const id = interaction.customId || '';
    if (!interaction.isButton?.() || !id.startsWith('cert:initial:')) return false;
    const valid = config.enabled && Boolean(guildId) && interaction.guildId === guildId && /^\d{17,20}$/.test(interaction.user?.id || '');
    const origin = interaction.message?.interactionMetadata?.user?.id || interaction.message?.interaction?.user?.id;
    if (!valid || (origin && origin !== interaction.user.id)) {
      await interaction.reply({ content: 'Open your own student console in the configured server.', flags: 64, allowedMentions: { parse: [] } }); return true;
    }
    await interaction.deferReply({ flags: 64 });
    const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
    if (!['cert:initial:home', 'cert:initial:status', 'cert:initial:help'].includes(id)) { await respond({ content: 'Unknown console action. Run /start again.' }); return true; }
    try {
      const { record, authorized, invited, setupRequired } = await guard.run(interaction.user.id, async () => {
        const record = (await pool.query('SELECT status FROM certification_enrollments WHERE discord_user_id=$1', [interaction.user.id])).rows[0];
        const authorized = Boolean(await service.getCourseAuthorization(interaction.user.id));
        const closedAwaiting = config.enrollmentSubmissionEnabled !== true && record?.status === 'awaiting_acknowledgment';
        const setupRequired = closedAwaiting && !invitationFormConfigured(config);
        const invited = closedAwaiting && !setupRequired ? await invitations.hasPendingInvitation(interaction.user.id) : false;
        return { record, authorized, invited, setupRequired };
      });
      const canSubmit = (config.enrollmentSubmissionEnabled === true || invited) && (!record || record.status === 'awaiting_acknowledgment');
      const status = record ? (labels[record.status] || 'Admin review required') : 'Not registered';
      const next = authorized ? 'Your protected student panel is available.' : record?.status === 'pending' ? 'Your request is awaiting an admin approval or denial decision. Do not create another request.' : setupRequired ? 'Your registration is recorded, but the admin must configure the current agreement and comprehension check before acknowledgment can start. Contact the admin. Course access is not active.' : invited ? 'Your admin registration is ready for your acknowledgment. Complete the agreement, comprehension check and age declaration. General enrollment remains closed; submission requests admin review only.' : canSubmit ? 'Read the agreement, complete the comprehension check and age declaration, then submit your request for admin review.' : record?.status === 'approved' ? 'Enrollment is approved, but current course-access requirements did not pass. Ask the admin to inspect your record.' : record && ['denied', 'suspended', 'revoked'].includes(record.status) ? 'Contact the admin privately. This console cannot reset or reinstate your enrollment.' : 'New enrollment submissions are currently closed. Contact the admin; registration alone does not grant access.';
      const description = id === 'cert:initial:help' ? 'You complete your own agreement acknowledgment, reading confirmation, comprehension answers, and age-18-or-older declaration. The admin then approves or denies the request. Registration and submission do not issue a permanent ID or grant course or lab access. Do not submit identity documents or private details here.' : next;
      await respond({ embeds: [{ title: 'NeptuneGuard — Initial student console', color: 0x3498db, description, fields: [{ name: 'Application status', value: status }, { name: 'Course access', value: authorized ? 'Current checks passed' : 'Not available' }, { name: 'Next step', value: next }], footer: { text: 'Private • Viewing this console does not change access' } }], components: [new ActionRowBuilder().addComponents(button(invited ? 'cert:invite:start' : 'cert:submit:start', setupRequired ? 'Awaiting agreement setup' : invited ? 'Complete invited registration' : record ? 'Continue registration' : 'Start registration', !canSubmit), button('cert:initial:status', 'My application status'), button('cert:initial:help', 'Requirements / help'), button('cert:learner:home', 'Open student panel', !authorized))] });
    } catch (error) {
      await respond({ content: error instanceof StatusReadLimitError ? 'Status checks are busy or rate limited. Wait briefly, then run /start again.' : 'Your application status could not be checked. No access change was requested. Retry later or contact the admin.' });
    }
    return true;
  };
}
