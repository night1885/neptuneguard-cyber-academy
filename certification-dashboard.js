import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { handleConsoleCourses } from './certification-console-courses.js';

function button(id, label, disabled = false) {
  return new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
}

export async function handleCertificationDashboard(interaction, pool, config, guildId) {
  if (!interaction.isButton() || !interaction.customId.startsWith('cert:admin:')) return false;
  if (await handleConsoleCourses(interaction, config, guildId)) return true;
  await interaction.deferReply({ flags: 64 });
  if (!config.enabled || interaction.user.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.editReply({ content: 'This dashboard is restricted to the configured admin and server.', components: [], embeds: [] });
    return true;
  }
  const match = /^cert:admin:(overview|enrollments|labs):(\d{1,6})$/.exec(interaction.customId);
  if (!match) {
    await interaction.editReply({ content: 'Invalid dashboard action.', components: [], embeds: [] });
    return true;
  }
  const [, view, pageText] = match;
  const page = Number(pageText);
  const navigation = new ActionRowBuilder().addComponents(
    button('cert:admin:overview:0', 'Overview'),
    button('cert:admin:enrollments:0', 'Enrollment requests'),
    button('cert:admin:labs:0', 'Lab requests')
  );
  const embed = new EmbedBuilder().setColor(0x3498db).setFooter({ text: 'Admin Dashboard • Lab approval is separate from enrollment' });
  const components = [navigation];
  if (view === 'overview') {
    const result = await pool.query(`SELECT e.*, l.*,
      (SELECT COUNT(*) FROM certification_audit_events) AS audit_events
      FROM (SELECT COUNT(*) AS total_students,
        COUNT(*) FILTER (WHERE status='pending') AS pending_enrollments,
        COUNT(*) FILTER (WHERE status='approved') AS enrolled_students,
        COUNT(*) FILTER (WHERE status='awaiting_acknowledgment') AS awaiting_acknowledgment,
        COUNT(*) FILTER (WHERE status='denied') AS denied_students,
        COUNT(*) FILTER (WHERE status='suspended') AS suspended_students,
        COUNT(*) FILTER (WHERE status='revoked') AS revoked_students,
        COUNT(*) FILTER (WHERE status IN ('approved','pending') AND
          (signature_method IS DISTINCT FROM 'discord_account' OR age_eligible IS DISTINCT FROM TRUE OR age_declared_at IS NULL)) AS declaration_review_candidates
        FROM certification_enrollments) e
      CROSS JOIN (SELECT
        COUNT(*) FILTER (WHERE status='pending') AS pending_labs,
        COUNT(*) FILTER (WHERE status='approved') AS approved_lab_records,
        COUNT(*) FILTER (WHERE status='approved' AND starts_at <= NOW() AND expires_at > NOW()) AS current_lab_authorizations,
        COUNT(*) FILTER (WHERE status='approved' AND expires_at <= NOW()) AS elapsed_approved_lab_records,
        COUNT(*) FILTER (WHERE status='revoked') AS revoked_lab_records
        FROM certification_lab_requests) l`);
    const counts = result.rows[0] || {};
    const count = key => String(counts[key] ?? '0');
    embed.setTitle('NeptuneGuard Certification — Admin Dashboard').setDescription(
      `Pending enrollments: ${count('pending_enrollments')}\nApproved students: ${count('enrolled_students')}\nPending lab requests: ${count('pending_labs')}\n\nReview enrollment requests and student access below. Enrollment approval does not grant lab access or award a certificate.`
    ).addFields(
      { name: 'Student directory', value: `Total: ${count('total_students')}\nAwaiting acknowledgment: ${count('awaiting_acknowledgment')}\nDenied: ${count('denied_students')}\nSuspended: ${count('suspended_students')}\nRevoked: ${count('revoked_students')}`, inline: true },
      { name: 'Lab authorization records', value: `Approved records: ${count('approved_lab_records')}\nWithin recorded time window: ${count('current_lab_authorizations')}\nApproved but elapsed: ${count('elapsed_approved_lab_records')}\nRevoked records: ${count('revoked_lab_records')}\nThese are authorization records, not running provider sessions.`, inline: true },
      { name: 'Requires review', value: `Pending/approved records with a legacy method or missing positive age declaration: ${count('declaration_review_candidates')}. This is a limited compatibility indicator, not a full eligibility assessment. No records were converted or changed.` },
      { name: 'Runtime configuration and audit', value: `New enrollment submissions: ${config.enrollmentSubmissionEnabled === true ? 'Enabled' : 'Disabled'}\nRecorded audit events: ${count('audit_events')}\nUse Configuration for the running process snapshot and Audit history for event metadata. This overview does not test provider health or implement certificate issuance.` }
    );
    components.push(new ActionRowBuilder().addComponents(
      button('cert:dir:pending:0:', 'Pending students'),
      button('cert:dir:approved:0:', 'Approved students'),
      button('cert:dir:suspended:0:', 'Suspended students'),
      button('cert:dir:revoked:0:', 'Revoked students')
    ));
  } else {
    const enrollment = view === 'enrollments';
    const result = await pool.query(enrollment
      ? `SELECT discord_user_id, agreement_version, acknowledged_at, learner_confirmed_read_at, comprehension_passed_at, signature_method FROM certification_enrollments WHERE status='pending' ORDER BY created_at, discord_user_id LIMIT 6 OFFSET $1`
      : `SELECT request_id, discord_user_id, lab_key, starts_at, expires_at FROM certification_lab_requests WHERE status='pending' ORDER BY created_at, request_id LIMIT 6 OFFSET $1`,
      [page * 5]);
    const rows = result.rows.slice(0, 5);
    embed.setTitle(`${enrollment ? 'Enrollment' : 'Lab'} review queue — page ${page + 1}`);
    if (!rows.length) embed.setDescription('No pending requests on this page.');
    const safe = value => String(value ?? 'Not supplied').replace(/[`*_~|<>]/g, '').slice(0, 100);
    for (const row of rows) {
      embed.addFields({ name: `Student ${safe(row.discord_user_id)}`, value: enrollment
        ? `Agreement: ${safe(row.agreement_version)}\nAcknowledged: ${row.acknowledged_at ? 'Yes' : 'No'}\nVerified read — learner-confirmed: ${row.learner_confirmed_read_at ? 'Yes' : 'No'}\nComprehension passed: ${row.comprehension_passed_at ? 'Yes' : 'No'}\nSigning method: ${safe(row.signature_method)}`
        : `Request: ${safe(row.request_id)}\nLab: ${safe(row.lab_key)}\nStart: ${safe(row.starts_at)}\nExpiry: ${safe(row.expires_at)}` });
    }
    components.push(new ActionRowBuilder().addComponents(
      button(`cert:admin:${view}:${Math.max(0, page - 1)}`, 'Previous', page === 0),
      button(`cert:admin:${view}:${page}`, 'Refresh'),
      button(`cert:admin:${view}:${page + 1}`, 'Next', result.rows.length <= 5)
    ));
  }
  components.push(new ActionRowBuilder().addComponents(button('cert:admin:courses:0', 'Course Overview')));
  await interaction.editReply({ content: '', embeds: [embed], components, allowedMentions: { parse: [] } });
  return true;
}

export function certificationDashboardEntry() {
  return { content: 'NeptuneGuard Certification — Admin Dashboard', components: [
    new ActionRowBuilder().addComponents(button('cert:admin:overview:0', 'Open admin dashboard'))
  ], allowedMentions: { parse: [] } };
}
