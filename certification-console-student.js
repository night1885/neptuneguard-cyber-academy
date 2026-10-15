import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { buildAdminNavigation } from './certification-admin-navigation.js';
import { buildAccessControls } from './certification-access-actions.js';
import { formatAuditAction } from './certification-console-browser.js';
import { evaluateCourseAccessReadiness } from './certification-access-readiness.js';
const safe = (value, max = 100) => String(value ?? 'Not recorded').replace(/[`*_~|<>@]/g, '').slice(0, max);
const stamp = value => value instanceof Date ? value.toISOString() : safe(value);
const button = (id, label, disabled = false) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
const row = (...buttons) => new ActionRowBuilder().addComponents(buttons);
export async function handleConsoleStudent(interaction, pool, config, guildId) {
  const id = interaction.customId || '';
  if (!interaction.isButton?.() || !(id.startsWith('cert:students:detail:') || id.startsWith('cert:student-audit:'))) return false;
  if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.reply({ content: 'Owner authorization in the configured server is required.', flags: 64, allowedMentions: { parse: [] } }); return true;
  }
  const detail = /^cert:students:detail:(\d{17,20})$/.exec(id);
  const timeline = /^cert:student-audit:(\d{17,20}):(\d{1,5})$/.exec(id);
  if ((!detail && !timeline) || (timeline && Number(timeline[2]) > 10000)) {
    await interaction.reply({ content: 'Invalid student-record action. Open Students again.', flags: 64, allowedMentions: { parse: [] } }); return true;
  }
  const studentId = (detail || timeline)[1];
  await interaction.deferReply({ flags: 64 });
  const components = [buildAdminNavigation('students')];
  const embed = new EmbedBuilder().setColor(0x3498db).setFooter({ text: 'Owner-only • Inspection is read-only • Separate confirmations for access changes' });
  if (detail) {
    const result = await pool.query('SELECT discord_user_id, student_id, status, agreement_version, agreement_content_sha256, acknowledgment_name, signature_reference, signature_method, acknowledged_at, learner_confirmed_read_at, comprehension_passed_at, comprehension_check_version, age_eligible, age_declared_at, age_declaration_version, approved_by, approved_at, status_reason, created_at, updated_at FROM certification_enrollments WHERE discord_user_id=$1', [studentId]);
    const record = result.rows[0];
    if (!record) { await interaction.editReply({ content: 'Student record not found.', embeds: [], components, allowedMentions: { parse: [] } }); return true; }
    const labs = (await pool.query(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status='pending') AS pending,
      COUNT(*) FILTER (WHERE status='approved') AS approved,
      COUNT(*) FILTER (WHERE status='approved' AND starts_at <= NOW() AND expires_at > NOW()) AS within_window,
      COUNT(*) FILTER (WHERE status='approved' AND expires_at <= NOW()) AS elapsed_approved,
      COUNT(*) FILTER (WHERE status='revoked') AS revoked,
      COUNT(*) FILTER (WHERE status='expired') AS expired
      FROM certification_lab_requests WHERE discord_user_id=$1`, [studentId])).rows[0];
    const count = key => safe(labs?.[key] ?? '0', 30);
    const readiness = evaluateCourseAccessReadiness(record, config);
    embed.setTitle('Student access record').setDescription(`Discord ID: ${studentId}\nPermanent ID: ${safe(record.student_id)}\nStored status: ${safe(record.status)}\n\nRecorded declarations are not independent identity or age verification. This view does not grant lab access or issue a certificate.`).addFields(
      { name: 'Course access readiness', value: `Course access checks: ${readiness.authorized ? 'Passed' : 'Blocked'}\nPending record ready for approval: ${readiness.readyForApproval ? 'Yes' : 'No'}\n${readiness.blockers.length ? readiness.blockers.join('\n') : 'No course-access blockers found.'}\nInspection does not change access or approve enrollment.` },
      { name: 'Agreement acknowledgment', value: `Version: ${safe(record.agreement_version)}\nMethod: ${safe(record.signature_method)}\nAcknowledged: ${stamp(record.acknowledged_at)}\nLearner-confirmed reading: ${stamp(record.learner_confirmed_read_at)}` },
      { name: 'Comprehension record', value: `Check version: ${safe(record.comprehension_check_version)}\nPassed at: ${stamp(record.comprehension_passed_at)}`, inline: true },
      { name: 'Self-declared age eligibility', value: `Age 18+: ${record.age_eligible === true ? 'Yes' : record.age_eligible === false ? 'No' : 'Not recorded'}\nDeclaration version: ${safe(record.age_declaration_version)}\nDeclared at: ${stamp(record.age_declared_at)}`, inline: true },
      { name: 'Approval record', value: `Approved by: ${safe(record.approved_by)}\nApproved at: ${stamp(record.approved_at)}` },
      { name: 'Record chronology', value: `Created: ${stamp(record.created_at)}\nUpdated: ${stamp(record.updated_at)}` },
      { name: 'Latest stored status reason', value: safe(record.status_reason, 500) },
      { name: 'This student — lab authorization records', value: `Total requests: ${count('total')}\nPending: ${count('pending')}\nApproved records: ${count('approved')}\nWithin recorded time window: ${count('within_window')}\nApproved but elapsed: ${count('elapsed_approved')}\nRevoked: ${count('revoked')}\nStored expired status: ${count('expired')}\nCounts describe stored authorizations, not running sessions or a full eligibility decision. Elapsed approved records remain approved until separately changed.` }
    );
    components.push(...buildAccessControls(studentId, record.status));
    if (record.status === 'pending') components.push(row(button(`cert:enrollment:review:${studentId}`, 'Review acknowledgment')));
    components.push(row(button(`cert:student-audit:${studentId}:0`, 'Student audit timeline'), button('cert:dir:search', 'Search / filter students'), button(`cert:labview:student:${studentId}:all:0`, 'This learner\'s labs'), button(id, 'Refresh student')));
  } else {
    const page = Number(timeline[2]);
    const result = await pool.query('SELECT event_id, actor_discord_user_id, action, created_at FROM certification_audit_events WHERE subject_discord_user_id=$1 ORDER BY created_at DESC, event_id DESC LIMIT 6 OFFSET $2', [studentId, page * 5]);
    const events = result.rows.slice(0, 5);
    embed.setTitle(`Student audit timeline — page ${page + 1}`).setDescription(`Student Discord ID: ${studentId}\n${events.length ? 'Newest subject-linked events first.' : 'No subject-linked events on this page.'} Private audit details are omitted.`);
    for (const event of events) embed.addFields({ name: `Event ${safe(event.event_id)} — ${formatAuditAction(event.action)}`, value: `Actor: ${safe(event.actor_discord_user_id)}\nTime: ${stamp(event.created_at)}` });
    components.push(row(button(`cert:students:detail:${studentId}`, 'Student record')));
    components.push(row(
      button(page === 0 ? 'cert:noop:student-audit:previous' : `cert:student-audit:${studentId}:${page - 1}`, 'Previous', page === 0),
      button(id, 'Refresh timeline'),
      button(page === 10000 ? 'cert:noop:student-audit:next' : `cert:student-audit:${studentId}:${page + 1}`, 'Next', result.rows.length <= 5 || page === 10000)
    ));
  }
  await interaction.editReply({ content: '', embeds: [embed], components, allowedMentions: { parse: [] } });
  return true;
}
