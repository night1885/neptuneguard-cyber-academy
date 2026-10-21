import { randomUUID, createHash } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createCertificationSubmission } from './certification-submission.js';
import { createRegistrationInvitationReader } from './certification-registration-invitation.js';
import { AGE_DECLARATION_QUESTION, validateAgeDeclaration } from './certification-age-declaration.js';

export function createCertificationSubmissionHandler(pool, config, guildId, { invitedOnly = false, createSubmissionService = createCertificationSubmission, createInvitationReader = createRegistrationInvitationReader } = {}) {
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) throw new Error('Configured guild ID required');
  if (typeof invitedOnly !== 'boolean') throw new Error('Invalid invitation mode');
  if (typeof createSubmissionService !== 'function' || typeof createInvitationReader !== 'function') throw new Error('Trusted submission service and invitation reader factories required');
  const version = config.activeAgreementVersion;
  const hash = config.activeAgreementSha256;
  const checkVersion = config.comprehensionCheck?.version;
  const prompts = Array.isArray(config.comprehensionCheck?.questions) ? config.comprehensionCheck.questions.map(q => q?.prompt) : [];
  const answers = Array.isArray(config.comprehensionCheck?.correctAnswers) ? [...config.comprehensionCheck.correctAnswers] : [];
  const ready = config.enabled === true && (invitedOnly || config.enrollmentSubmissionEnabled === true) &&
    typeof version === 'string' && typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) &&
    typeof checkVersion === 'string' && prompts.length >= 1 && prompts.length <= 3 &&
    prompts.length === answers.length && prompts.every(p => typeof p === 'string' && p.length > 0 && p.length <= 300);
  const service = createSubmissionService(pool, { ...config, comprehensionCheck: { version: checkVersion, correctAnswers: answers } });
  const invitations = createInvitationReader(pool, config);
  const sessions = new Map();
  const unchanged = () => config.enabled === true && (invitedOnly || config.enrollmentSubmissionEnabled === true) &&
    config.activeAgreementVersion === version && config.activeAgreementSha256 === hash &&
    config.comprehensionCheck?.version === checkVersion &&
    JSON.stringify(config.comprehensionCheck?.correctAnswers) === JSON.stringify(answers) &&
    JSON.stringify(config.comprehensionCheck?.questions?.map(q => q?.prompt)) === JSON.stringify(prompts);

  return async function handleSubmissionInteraction(interaction) {
    if (!(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId?.startsWith('cert:submit:')) return false;
    const respond = payload => interaction.deferred || interaction.replied
      ? interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload })
      : interaction.reply({ flags: 64, allowedMentions: { parse: [] }, ...payload });
    if (!ready || !unchanged() || interaction.guildId !== guildId || !/^\d{17,20}$/.test(interaction.user?.id || '')) {
      await respond({ content: 'Enrollment submission is unavailable in this context.' }); return true;
    }
    for (const [token, record] of sessions) if (record.expiresAt <= Date.now()) sessions.delete(token);
    const display = async (token, record) => {
      const last = record.page === record.pages.length - 1;
      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cert:submit:previous:${token}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(record.page === 0),
        new ButtonBuilder().setCustomId(`cert:submit:${last ? 'form' : 'next'}:${token}`).setLabel(last ? 'Open acknowledgment form' : 'Next').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`cert:submit:cancel:${token}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary));
      await respond({ content: `Agreement ${version} — page ${record.page + 1}/${record.pages.length}\n\n${record.pages[record.page]}`, components: [controls] });
    };
    try {
      if (interaction.customId === 'cert:submit:start' && interaction.isButton()) {
        await interaction.deferReply({ flags: 64 });
        if (invitedOnly && !await invitations.hasPendingInvitation(interaction.user.id)) {
          await respond({ content: 'A pending registration from the configured admin is required. No enrollment record changed.' }); return true;
        }
        for (const [token, record] of sessions) if (record.actorId === interaction.user.id) sessions.delete(token);
        if (sessions.size >= 100) { await respond({ content: 'Enrollment is busy. Retry after existing sessions expire.' }); return true; }
        const row = (await pool.query('SELECT content, content_sha256 FROM certification_agreements WHERE version=$1', [version])).rows[0];
        if (!row || typeof row.content !== 'string' || row.content.length > 60000 || row.content_sha256 !== hash || createHash('sha256').update(row.content, 'utf8').digest('hex') !== hash) {
          await respond({ content: 'The approved agreement is unavailable. No enrollment record changed.' }); return true;
        }
        if (!unchanged() || sessions.size >= 100) { await respond({ content: 'Enrollment configuration changed or the service is busy. Start again later.' }); return true; }
        for (const [token, record] of sessions) if (record.actorId === interaction.user.id) sessions.delete(token);
        const text = `${row.content}\n\nComprehension questions (${checkVersion})\n${prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n${AGE_DECLARATION_QUESTION} Answer Yes or No in the form. Only Yes permits enrollment. Type AGREE to state that you have read and agree to this agreement using your Discord account. Do not enter your name, birth date, contact details, or identity-document information. This is self-declared eligibility, not independent verification. Submission requests admin approval only; it grants no course or lab access.`;
        const pages = []; for (let i = 0; i < text.length; i += 1700) pages.push(text.slice(i, i + 1700));
        const token = randomUUID();
        const record = { actorId: interaction.user.id, guildId, pages, page: 0, stage: 'reading', expiresAt: Date.now() + 900000 };
        sessions.set(token, record); await display(token, record); return true;
      }
      const match = /^cert:submit:(previous|next|form|send|cancel):([a-f0-9-]{36})$/.exec(interaction.customId);
      const record = match && sessions.get(match[2]);
      if (!record || record.actorId !== interaction.user.id || record.guildId !== interaction.guildId) {
        await respond({ content: 'Session expired, belongs to another learner, or was invalidated by a restart. Start again.' }); return true;
      }
      const [, action, token] = match;
      if (action === 'cancel' && interaction.isButton()) { sessions.delete(token); await respond({ content: 'Canceled. No enrollment record changed.' }); return true; }
      if (['previous', 'next'].includes(action) && interaction.isButton() && record.stage === 'reading') {
        record.page = Math.max(0, Math.min(record.pages.length - 1, record.page + (action === 'next' ? 1 : -1)));
        await display(token, record); return true;
      }
      if (action === 'form' && interaction.isButton() && record.stage === 'reading' && record.page === record.pages.length - 1) {
        const modal = new ModalBuilder().setCustomId(`cert:submit:send:${token}`).setTitle('Acknowledge and request enrollment');
        const field = (id, label, max) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(max));
        modal.addComponents(field('age', 'Age 18 or older? Type Yes or No', 3), field('read', 'Type AGREE: I have read and agree', 5));
        prompts.forEach((_, i) => modal.addComponents(field(`answer${i}`, `Question ${i + 1}: answer as instructed`, 100)));
        record.stage = 'form'; await interaction.showModal(modal); return true;
      }
      if (action === 'send' && interaction.isModalSubmit() && record.stage === 'form') {
        sessions.delete(token);
        await interaction.deferReply({ flags: 64 });
        const ageEligibility = interaction.fields.getTextInputValue('age').toLowerCase();
        if (ageEligibility === 'no') { await respond({ content: 'Enrollment requires age 18 or older. No enrollment record was submitted.' }); return true; }
        validateAgeDeclaration({ ageEligibility });
        const accepted = interaction.fields.getTextInputValue('read') === 'AGREE';
        const submit = invitedOnly ? service.submitInvitedEnrollment : service.submitEnrollment;
        const result = await submit(interaction.user.id, {
          ageEligibility, acknowledgmentAccepted: accepted, confirmedRead: accepted,
          agreementVersion: version, agreementSha256: hash, comprehensionCheckVersion: checkVersion,
          answers: prompts.map((_, i) => interaction.fields.getTextInputValue(`answer${i}`))
        });
        await respond({ content: `${result.alreadySubmitted ? 'Your matching request is already pending.' : 'Enrollment request submitted for admin review.'} No student ID, course access, lab permission, or certificate was issued by this submission.` }); return true;
      }
      await respond({ content: 'Invalid session action. Start again if the form is no longer available.' }); return true;
    } catch {
      const token = /^cert:submit:[a-z]+:([a-f0-9-]{36})$/.exec(interaction.customId)?.[1];
      if (token) sessions.delete(token);
      await respond({ content: 'The submission could not be completed. If you already submitted, check with the admin before retrying. Otherwise start again and confirm the agreement, age eligibility, and answers. No automatic access is granted.' });
      return true;
    }
  };
}
