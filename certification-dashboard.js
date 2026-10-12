import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

function button(id, label, disabled = false) {
  return new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
}

export async function handleCertificationDashboard(interaction, pool, config, guildId) {
  if (!interaction.isButton() || !interaction.customId.startsWith('cert:admin:')) return false;
  await interaction.deferReply({ flags: 64 });
  if (!config.enabled || interaction.user.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.editReply({ content: 'This dashboard is restricted to the configured owner and server.', components: [], embeds: [] });
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
  const embed = new EmbedBuilder().setColor(0x3498db).setFooter({ text: 'Owner console • Lab approval is separate from enrollment' });
  const components = [navigation];
  if (view === 'overview') {
    const result = await pool.query(`SELECT
      (SELECT COUNT(*) FROM certification_enrollments WHERE status='pending') AS pending_enrollments,
      (SELECT COUNT(*) FROM certification_enrollments WHERE status='approved') AS enrolled_students,
      (SELECT COUNT(*) FROM certification_lab_requests WHERE status='pending') AS pending_labs`);
    const counts = result.rows[0];
    embed.setTitle('NeptuneGuard Certification — Owner Console').setDescription(
      `Pending enrollments: ${counts.pending_enrollments}\nApproved students: ${counts.enrolled_students}\nPending lab requests: ${counts.pending_labs}\n\nReview enrollment requests and student access below. Hosted-lab approval and session controls are separate; enrollment approval does not grant lab access or award a certificate.`
    );
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
  await interaction.editReply({ content: '', embeds: [embed], components, allowedMentions: { parse: [] } });
  return true;
}

export function certificationDashboardEntry() {
  return { content: 'NeptuneGuard Certification — Owner Dashboard', components: [
    new ActionRowBuilder().addComponents(button('cert:admin:overview:0', 'Open owner dashboard'))
  ], allowedMentions: { parse: [] } };
}
