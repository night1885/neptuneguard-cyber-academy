import { randomUUID, createHash } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createAgeCheckedCertificationSubmission } from './certification-age-submission.js';
import { createCertificationAgeRenewal } from './certification-age-renewal.js';
import { requireEligibleCertificationAge } from './certification-age-eligibility.js';

export function createCertificationSubmissionHandler(pool, config, guildId) {
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId)) throw new Error('Configured guild ID required');
  const version = config.activeAgreementVersion; const hash = config.activeAgreementSha256;
  const checkVersion = config.comprehensionCheck?.version;
  const prompts = Array.isArray(config.comprehensionCheck?.questions) ? config.comprehensionCheck.questions.map(q => q?.prompt) : [];
  const answers = Array.isArray(config.comprehensionCheck?.correctAnswers) ? [...config.comprehensionCheck.correctAnswers] : [];
  const ready = config.enabled === true && config.enrollmentSubmissionEnabled === true &&
    typeof version === 'string' && typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) &&
    typeof checkVersion === 'string' && prompts.length >= 1 && prompts.length <= 3 &&
    prompts.length === answers.length && prompts.every(p => typeof p === 'string' && p.length > 0 && p.length <= 300);
  const serviceConfig = { ...config, comprehensionCheck: { version: checkVersion, correctAnswers: answers } };
  const service = createAgeCheckedCertificationSubmission(pool, serviceConfig);
  const renewalService = createCertificationAgeRenewal(pool, serviceConfig);
  const sessions = new Map();
  const unchanged = () => config.enabled === true && config.enrollmentSubmissionEnabled === true &&
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
        new ButtonBuilder().setCustomId(`cert:submit:${last ? 'form' : 'next'}:${token}`).setLabel(last ? (record.renewal ? 'Open eligibility renewal form' : 'Open acknowledgment form') : 'Next').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`cert:submit:cancel:${token}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary));
      await respond({ content: `${record.renewal ? 'Eligibility renewal — ' : ''}Agreement ${version} — page ${record.page + 1}/${record.pages.length}\n\n${record.pages[record.page]}`, components: [controls] });
    };
    try {
      if (['cert:submit:start', 'cert:submit:renew'].includes(interaction.customId) && interaction.isButton()) {
        const renewal = interaction.customId === 'cert:submit:renew';
        await interaction.deferReply({ flags: 64 });
        for (const [token, record] of sessions) if (record.actorId === interaction.user.id) sessions.delete(token);
        if (sessions.size >= 100) { await respond({ content: 'Enrollment is busy. Retry after existing sessions expire.' }); return true; }
        const row = (await pool.query('SELECT content, content_sha256 FROM certification_agreements WHERE version=$1', [version])).rows[0];
        if (!row || typeof row.content !== 'string' || row.content.length > 60000 || row.content_sha256 !== hash || createHash('sha256').update(row.content, 'utf8').digest('hex') !== hash) {
          await respond({ content: 'The approved agreement is unavailable. No enrollment record changed.' }); return true;
        }
        if (!unchanged() || sessions.size >= 100) { await respond({ content: 'Enrollment configuration changed or the service is busy. Start again later.' }); return true; }
        for (const [token, record] of sessions) if (record.actorId === interaction.user.id) sessions.delete(token);
        const purpose = renewal ? 'This renews eligibility only for a matching suspended or revoked enrollment. It does not change your agreement acknowledgment or restore course/lab access. Owner review and reinstatement remain separate.' : 'Submission requests enrollment only; it grants no course or lab access.';
        const text = `${row.content}\n\nComprehension questions (${checkVersion})\n${prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nEnrollment requires age 16 or older. In the reading field, type READ followed by your age in whole years, for example READ 16. This confirms reading and reports your age; it does not independently verify either. No parental-consent step is required by the selected policy. Opening every page does not prove reading. ${purpose}`;
        const pages = []; for (let i = 0; i < text.length; i += 1700) pages.push(text.slice(i, i + 1700));
        const token = randomUUID();
        const record = { actorId: interaction.user.id, guildId, renewal, pages, page: 0, stage: 'reading', expiresAt: Date.now() + 900000 };
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
        const modal = new ModalBuilder().setCustomId(`cert:submit:send:${token}`).setTitle(record.renewal ? 'Confirm age eligibility renewal' : 'Acknowledge and request enrollment');
        const field = (id, label, max) => new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(max));
        modal.addComponents(field('name', 'Type your full name to acknowledge', 200), field('read', 'Type READ and your age (example: READ 16)', 21));
        prompts.forEach((_, i) => modal.addComponents(field(`answer${i}`, `Question ${i + 1}: answer as instructed`, 100)));
        record.stage = 'form'; await interaction.showModal(modal); return true;
      }
      if (action === 'send' && interaction.isModalSubmit() && record.stage === 'form') {
        sessions.delete(token); await interaction.deferReply({ flags: 64 });
        const reading = /^READ (0|[1-9][0-9]*)$/.exec(interaction.fields.getTextInputValue('read').trim());
        try { requireEligibleCertificationAge(reading?.[1]); }
        catch {
          await respond({ content: 'Enrollment requires age 16 or older and explicit reading confirmation. Enter READ followed by your age in whole years. No enrollment record changed. People under 16 cannot register.' }); return true;
        }
        const input = { typedName: interaction.fields.getTextInputValue('name'), confirmedRead: true, reportedAge: reading[1], agreementVersion: version, agreementSha256: hash, comprehensionCheckVersion: checkVersion, answers: prompts.map((_, i) => interaction.fields.getTextInputValue(`answer${i}`)) };
        if (record.renewal) {
          const result = await renewalService.renewEligibility(interaction.user.id, input);
          await respond({ content: `${result.alreadyConfirmed ? 'Current eligibility confirmation was already recorded.' : 'Eligibility confirmation recorded for owner review.'} Enrollment status at renewal: ${result.status}. No course access, lab permission, or certificate was granted. Owner reinstatement remains separate; check status before relying on this snapshot.` }); return true;
        }
        const result = await service.submitEnrollment(interaction.user.id, input);
        await respond({ content: `${result.alreadySubmitted ? 'Your matching request is already pending.' : 'Enrollment request submitted for owner review.'} No student ID, course access, lab permission, or certificate was issued by this submission.` }); return true;
      }
      await respond({ content: 'Invalid session action. Start again if the form is no longer available.' }); return true;
    } catch {
      const token = /^cert:submit:[a-z]+:([a-f0-9-]{36})$/.exec(interaction.customId)?.[1]; if (token) sessions.delete(token);
      await respond({ content: 'The enrollment or renewal action could not be completed. If you already submitted, check with the owner before retrying. Otherwise start again and confirm the agreement and answers. No automatic access is granted.' }); return true;
    }
  };
}
