import { observeSubmissionOperation } from './certification-submission-deadline.js';

export async function handleEnrollmentStatus(interaction, pool, config, guildId, timeoutMs = 10000) {
  if (!interaction.isButton() || !/^cert:submit:status(?::|$)/.test(interaction.customId || '')) return false;
  await interaction.deferReply({ flags: 64 });
  const reply = content => interaction.editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } });
  if (config.enabled !== true || interaction.guildId !== guildId || !/^\d{17,20}$/.test(interaction.user?.id || '')) {
    await reply('Enrollment status is unavailable in this context.'); return true;
  }
  const match = /^cert:submit:status(?::(\d{17,20}))?$/.exec(interaction.customId);
  if (!match) { await reply('Invalid enrollment-status action.'); return true; }
  if (match[1] && interaction.user.id !== config.ownerId) {
    await reply('Owner authorization is required to view a specified learner.'); return true;
  }
  const target = match[1] || interaction.user.id;
  try {
    const observed = await observeSubmissionOperation(pool.query(
      'SELECT status, student_id FROM certification_enrollments WHERE discord_user_id=$1', [target]),
      () => reply('Enrollment status could not be confirmed in time. This does not prove the submission failed. Ask the owner to review before resubmitting.'), timeoutMs);
    if (observed.timedOut) return true;
    const row = observed.value.rows[0];
    const snapshot = 'This is a database snapshot. An in-flight request may not have committed yet; absence or unchanged status does not prove failure. Do not blindly resubmit after a timeout. This check grants no access or lab permission.';
    if (!row) { await reply(`No committed enrollment record was found for Discord ID ${target}.\n${snapshot}`); return true; }
    if (!['awaiting_acknowledgment', 'pending', 'approved', 'denied', 'suspended', 'revoked'].includes(row.status)) {
      await reply('The enrollment record requires owner review. This check grants no access.'); return true;
    }
    const id = typeof row.student_id === 'string' && /^NG-PT-[A-Za-z0-9-]{1,80}$/.test(row.student_id) ? row.student_id : 'Not issued or requires owner review';
    await reply(`Discord ID: ${target}\nEnrollment status: ${row.status}\nPermanent student ID: ${id}\n${snapshot}`);
    return true;
  } catch {
    await reply('Enrollment status could not be confirmed. Ask the owner to review before resubmitting. No enrollment record was changed by this check.');
    return true;
  }
}
