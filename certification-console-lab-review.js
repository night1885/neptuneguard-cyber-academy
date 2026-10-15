import { buildLabReviewSummary } from './certification-lab-review-summary.js';
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const button = (custom_id, label) => ({ type: 2, style: 2, custom_id, label });
const row = (...components) => ({ type: 1, components });

export async function handleLabReview(interaction, pool, config, guildId) {
  const id = interaction.customId || '';
  if (!interaction.isButton?.() || !id.startsWith('cert:labview:review:')) return false;
  const allowedMentions = { parse: [] };
  if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.reply({ content: 'Owner authorization in the configured server is required.', flags: 64, allowedMentions }); return true;
  }
  const match = new RegExp(`^cert:labview:review:(${uuid})$`).exec(id);
  if (!match) {
    await interaction.reply({ content: 'Invalid lab-review action. Open Lab records again.', flags: 64, allowedMentions }); return true;
  }
  await interaction.deferReply({ flags: 64 });
  const result = await pool.query(`SELECT r.request_id, r.discord_user_id, r.lab_key, r.status,
    r.rules_version, r.rules_acknowledged_at, r.starts_at, r.expires_at,
    e.discord_user_id AS enrollment_discord_user_id, e.status AS enrollment_status,
    e.student_id, e.approved_by, e.approved_at, e.signature_method,
    CASE WHEN e.acknowledgment_name IS NULL THEN NULL ELSE 'present' END AS acknowledgment_name,
    CASE WHEN e.signature_reference IS NULL THEN NULL ELSE 'present' END AS signature_reference,
    e.agreement_version, e.agreement_content_sha256, e.acknowledged_at,
    e.learner_confirmed_read_at, e.comprehension_passed_at, e.comprehension_check_version,
    e.age_eligible, e.age_declared_at, e.age_declaration_version
    FROM certification_lab_requests r
    LEFT JOIN certification_enrollments e ON e.discord_user_id=r.discord_user_id
    WHERE r.request_id=$1::uuid`, [match[1]]);
  const record = result.rows[0];
  const components = [row(button(`cert:labview:detail:${match[1]}`, 'Back to request'), button(id, 'Refresh review')),
    row(button('cert:admin:overview:0', 'Overview'), button('cert:labview:all:0', 'All lab records'))];
  if (!record) {
    await interaction.editReply({ content: 'Lab request not found. No records changed.', embeds: [], components, allowedMentions }); return true;
  }
  const learner = record.enrollment_discord_user_id == null ? null : {
    ...record, discord_user_id: record.enrollment_discord_user_id, status: record.enrollment_status
  };
  await interaction.editReply({ content: '', embeds: [buildLabReviewSummary(record, learner, config)], components, allowedMentions });
  return true;
}
