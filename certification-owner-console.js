import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { hasCurrentAgeEligibility } from './certification-age-evidence.js';

const sections = { overview: ['Overview', 'Enrollment and lab-request summary'], enrollments: ['Enrollment review', 'Pending acknowledgment and eligibility evidence'], restricted: ['Restricted access', 'Suspended and revoked enrollment records'], directory: ['Student directory', 'Enrollment records across all statuses'], labs: ['Lab requests', 'Pending requests; authorization stays separate'] };
const safe = value => String(value ?? 'Not recorded').replace(/[`*_~|<>@]/g, '').slice(0, 160);
const button = (id, label, disabled = false) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);
const count = value => /^\d{1,15}$/.test(String(value)) ? String(value) : 'Unavailable';
export async function handleOwnerConsole(interaction, pool, config, guildId) {
  const isButton = interaction.isButton(); const isSelect = interaction.isStringSelectMenu?.() === true;
  const legacy = isButton && interaction.customId === 'cert:admin:overview:0';
  if (!(isButton || isSelect) || (!legacy && !interaction.customId?.startsWith('cert:console:'))) return false;
  await interaction.deferReply({ flags: 64 });
  const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
  if (config.enabled !== true || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) { await respond({ content: 'This owner console is restricted to the configured owner and server.' }); return true; }
  let view; let page = 0;
  if (legacy) view = 'overview';
  else if (isSelect && interaction.customId === 'cert:console:section' && Array.isArray(interaction.values) && interaction.values.length === 1 && Object.hasOwn(sections, interaction.values[0])) view = interaction.values[0];
  else if (isButton) { const match = /^cert:console:(overview|enrollments|restricted|directory|labs):(\d{1,6})$/.exec(interaction.customId); if (match) { view = match[1]; page = Number(match[2]); } }
  if (!view) { await respond({ content: 'Invalid owner-console action. Reopen the dashboard.' }); return true; }
  try {
    const dropdown = new StringSelectMenuBuilder().setCustomId('cert:console:section').setPlaceholder('Choose an owner workspace').setMinValues(1).setMaxValues(1).addOptions(Object.entries(sections).map(([value, [label, description]]) => ({ value, label, description, default: value === view })));
    const components = [new ActionRowBuilder().addComponents(dropdown)];
    const embed = new EmbedBuilder().setColor(0x14b8a6).setAuthor({ name: 'NEPTUNEGUARD | OWNER OPERATIONS' }).setFooter({ text: 'Private database snapshot • Refresh before acting • No automatic access granted' }).setTimestamp();
    if (view === 'overview') {
      const result = await pool.query(`SELECT
        COUNT(*) FILTER (WHERE status='pending') AS pending_enrollments,
        COUNT(*) FILTER (WHERE status='approved') AS approved_enrollments,
        COUNT(*) FILTER (WHERE status='suspended') AS suspended_enrollments,
        COUNT(*) FILTER (WHERE status='revoked') AS revoked_enrollments,
        COUNT(*) FILTER (WHERE status='awaiting_acknowledgment') AS awaiting_acknowledgment,
        (SELECT COUNT(*) FROM certification_lab_requests WHERE status='pending') AS pending_labs
        FROM certification_enrollments`);
      const row = result.rows[0] || {};
      embed.setTitle('NeptuneGuard Certification — Owner Console').setDescription('Your enrollment and access-review workspace. Choose a focused queue below, inspect the learner record, then use its existing review controls. Counts describe stored statuses, not verified age or effective authorization.');
      for (const [key, label] of [['pending_enrollments', 'Pending enrollments'], ['approved_enrollments', 'Approved enrollments'], ['suspended_enrollments', 'Suspended enrollments'], ['revoked_enrollments', 'Revoked enrollments'], ['awaiting_acknowledgment', 'Awaiting acknowledgment'], ['pending_labs', 'Pending lab requests']]) embed.addFields({ name: label, value: count(row[key]), inline: true });
      embed.addFields({ name: 'Operational boundaries', value: 'Eligibility is self-reported, not independent age verification. Renewal does not remove restrictions. Enrollment approval, owner reinstatement, lab authorization, and certificate issuance remain separate.' });
      components.push(new ActionRowBuilder().addComponents(button('cert:console:enrollments:0', 'Review enrollments'), button('cert:console:restricted:0', 'Review restrictions'), button('cert:console:overview:0', 'Refresh overview'), button('cert:owner:lookup', 'Find learner')));
    } else {
      const labs = view === 'labs';
      const where = view === 'enrollments' ? "WHERE status='pending'" : view === 'restricted' ? "WHERE status IN ('suspended','revoked')" : '';
      const result = await pool.query(labs ? `SELECT request_id, discord_user_id, lab_key, starts_at, expires_at FROM certification_lab_requests WHERE status='pending' ORDER BY created_at, request_id LIMIT 6 OFFSET $1` : `SELECT discord_user_id, status, student_id, agreement_version, acknowledged_at, learner_confirmed_read_at, comprehension_passed_at, age_eligibility_confirmed, age_eligibility_confirmed_at, age_policy_version FROM certification_enrollments ${where} ORDER BY created_at, discord_user_id LIMIT 6 OFFSET $1`, [page * 5]);
      const rows = result.rows.slice(0, 5);
      embed.setTitle(`${sections[view][0]} — page ${page + 1}`).setDescription(rows.length ? (labs ? 'Review requested scope and dates. This panel cannot approve labs or terminate provider sessions.' : 'Review evidence alongside enrollment status. Open a learner record for existing controls; this queue itself changes nothing.') : 'No records on this page. Use Previous or choose another workspace.');
      for (const row of rows) embed.addFields({ name: `Student ${safe(row.discord_user_id)}`, value: labs ? `Request: ${safe(row.request_id)}
Lab: ${safe(row.lab_key)}
Start: ${safe(row.starts_at)}
Expiry: ${safe(row.expires_at)}` : `Status: ${safe(row.status)}
Permanent ID: ${safe(row.student_id)}
Agreement: ${safe(row.agreement_version)}
Acknowledgment: ${row.acknowledged_at ? 'Recorded' : 'Not recorded'} | Reading confirmation: ${row.learner_confirmed_read_at ? 'Recorded' : 'Not recorded'}
Comprehension: ${row.comprehension_passed_at ? 'Recorded' : 'Not recorded'}
Eligibility: ${hasCurrentAgeEligibility(row) ? 'Current-policy self-report recorded' : 'Missing, invalid or outdated — review required'}` });
      components.push(new ActionRowBuilder().addComponents(button(`cert:console:${view}:${Math.max(0, page - 1)}`, 'Previous', page === 0), button(`cert:console:${view}:${page}`, 'Refresh'), button(`cert:console:${view}:${Math.min(999999, page + 1)}`, 'Next', result.rows.length <= 5 || page === 999999)));
      const valid = rows.filter(row => /^\d{17,20}$/.test(row.discord_user_id || ''));
      if (!labs && valid.length) components.push(new ActionRowBuilder().addComponents(valid.map((row, i) => button(view === 'enrollments' ? `cert:enrollment:review:${row.discord_user_id}` : `cert:students:detail:${row.discord_user_id}`, `${view === 'enrollments' ? 'Review' : 'Open record'} ${i + 1}`))));
    }
    await respond({ embeds: [embed], components }); return true;
  } catch { await respond({ content: 'Owner-console data could not be loaded. No record was changed. Reopen or refresh the dashboard.' }); return true; }
}
