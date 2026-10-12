import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { handleCertificationDashboard } from './certification-dashboard.js';
import { handleEnrollmentAction } from './certification-enrollment-actions.js';
import { createCertificationService } from './certification-service.js';
import { createAccessActionHandler, buildAccessControls } from './certification-access-actions.js';
import { handleCertificationLearner } from './certification-learner.js';
import { createCertificationSubmissionHandler } from './certification-submission-interactions.js';

const button = (id, label, disabled = false) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(disabled);

export function createCertificationRouter(pool, config, guildId) {
  if (!/^\d{17,20}$/.test(guildId || '')) throw new Error('Configured guild ID required');
  const service = createCertificationService(pool, config);
  const access = createAccessActionHandler(pool, config, guildId);
  const submission = createCertificationSubmissionHandler(pool, config, guildId);
  return async function routeCertificationInteraction(interaction) {
    if (!(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId.startsWith('cert:')) return false;
    if (interaction.customId.startsWith('cert:access:')) return access(interaction);
    if (interaction.customId.startsWith('cert:submit:')) return submission(interaction);
    if (!interaction.isButton()) {
      await interaction.reply({ content: 'Unsupported certification form.', flags: 64 }); return true;
    }
    if (await handleCertificationLearner(interaction, config, guildId, service)) return true;
    if (interaction.customId.startsWith('cert:enrollment:')) return handleEnrollmentAction(interaction, pool, config, guildId, service);
    if (interaction.customId.startsWith('cert:students:')) {
      await interaction.deferReply({ flags: 64 });
      const respond = payload => interaction.editReply({ content: '', embeds: [], components: [], allowedMentions: { parse: [] }, ...payload });
      if (!config.enabled || interaction.user.id !== config.ownerId || interaction.guildId !== guildId) {
        await respond({ content: 'Owner authorization in the configured server is required.' }); return true;
      }
      const list = /^cert:students:list:(\d{1,6})$/.exec(interaction.customId);
      const detail = /^cert:students:detail:(\d{17,20})$/.exec(interaction.customId);
      const back = new ActionRowBuilder().addComponents(button('cert:admin:overview:0', 'Overview'), button('cert:students:list:0', 'Student directory'));
      if (list) {
        const page = Number(list[1]);
        const result = await pool.query('SELECT discord_user_id, status FROM certification_enrollments ORDER BY created_at, discord_user_id LIMIT 6 OFFSET $1', [page * 5]);
        const rows = result.rows.slice(0, 5);
        const embed = new EmbedBuilder().setColor(0x3498db).setTitle(`Student directory — page ${page + 1}`).setDescription(rows.map((row, i) => `${i + 1}. ${row.discord_user_id} — ${row.status}`).join('\n') || 'No students on this page.');
        const components = [back, new ActionRowBuilder().addComponents(
          button(`cert:students:list:${Math.max(0, page - 1)}`, 'Previous', page === 0),
          button(`cert:students:list:${page}`, 'Refresh'),
          button(`cert:students:list:${page + 1}`, 'Next', result.rows.length <= 5))];
        if (rows.length) components.push(new ActionRowBuilder().addComponents(rows.map((row, i) => button(`cert:students:detail:${row.discord_user_id}`, `Student ${i + 1}`))));
        await respond({ embeds: [embed], components }); return true;
      }
      if (detail) {
        const result = await pool.query('SELECT discord_user_id, student_id, status, agreement_version FROM certification_enrollments WHERE discord_user_id=$1', [detail[1]]);
        const row = result.rows[0];
        if (!row) { await respond({ content: 'Student record not found.', components: [back] }); return true; }
        const safe = value => String(value ?? 'Not issued').replace(/[`*_~|<>]/g, '').slice(0, 100);
        const embed = new EmbedBuilder().setColor(0x3498db).setTitle('Student access record').setDescription(`Discord ID: ${row.discord_user_id}\nPermanent ID: ${safe(row.student_id)}\nStatus: ${row.status}\nAgreement: ${safe(row.agreement_version)}`);
        const components = [back, ...buildAccessControls(row.discord_user_id, row.status)];
        if (row.status === 'pending') components.push(new ActionRowBuilder().addComponents(button(`cert:enrollment:review:${row.discord_user_id}`, 'Review acknowledgment')));
        await respond({ embeds: [embed], components }); return true;
      }
      await respond({ content: 'Invalid student-directory action.' }); return true;
    }
    if (interaction.customId.startsWith('cert:admin:')) {
      const adapter = { user: interaction.user, guildId: interaction.guildId, customId: interaction.customId,
        isButton: () => true, deferReply: options => interaction.deferReply(options),
        editReply: async payload => {
          if (config.enabled && interaction.user.id === config.ownerId && interaction.guildId === guildId && payload.components?.length) {
            payload.components[0].addComponents(button('cert:students:list:0', 'Students'));
            if (/^cert:admin:enrollments:\d+$/.test(interaction.customId)) {
              const ids = (payload.embeds?.[0]?.data?.fields || []).map(field => /^Student (\d{17,20})$/.exec(field.name)?.[1]).filter(Boolean);
              if (ids.length) payload.components.push(new ActionRowBuilder().addComponents(ids.map((id, index) => button(`cert:enrollment:review:${id}`, `Review ${index + 1}`))));
            }
          }
          return interaction.editReply(payload);
        } };
      return handleCertificationDashboard(adapter, pool, config, guildId);
    }
    await interaction.reply({ content: 'This certification feature is not connected yet.', flags: 64 });
    return true;
  };
}
