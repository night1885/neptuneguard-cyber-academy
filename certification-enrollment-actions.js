import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';

export async function handleEnrollmentAction(interaction, pool, config, guildId, service) {
  if (!interaction.isButton() || !interaction.customId.startsWith('cert:enrollment:')) return false;
  await interaction.deferReply({ flags: 64 });
  const reply = content => interaction.editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } });
  if (!config.enabled || interaction.user.id !== config.ownerId || interaction.guildId !== guildId) {
    await reply('Owner authorization in the configured server is required.');
    return true;
  }
  const match = /^cert:enrollment:(review|approve|cancel):(\d{17,20})$/.exec(interaction.customId);
  if (!match) { await reply('Invalid enrollment action.'); return true; }
  const [, action, studentDiscordId] = match;
  if (action === 'cancel') { await reply('Approval canceled. No enrollment was changed.'); return true; }
  if (action === 'review') {
    const result = await pool.query(
      `SELECT status, agreement_version, acknowledged_at, signature_method,
              acknowledgment_name, learner_confirmed_read_at, comprehension_passed_at
       FROM certification_enrollments WHERE discord_user_id=$1`, [studentDiscordId]);
    const row = result.rows[0];
    if (!row || row.status !== 'pending') { await reply('This request is not pending. Refresh the queue.'); return true; }
    const complete = hasCompleteTypedAcknowledgment(row);
    const safe = value => String(value ?? 'Not supplied').replace(/[`*_~|<>]/g, '').slice(0, 100);
    const embed = new EmbedBuilder().setColor(0xf1c40f).setTitle('Confirm enrollment approval')
      .setDescription(`Student Discord ID: ${studentDiscordId}\nAgreement: ${safe(row.agreement_version)}\nAcknowledgment method: ${safe(row.signature_method)}\nRequired records complete: ${complete ? 'Yes' : 'No'}\n\nNo uploaded agreement document is required. Approval activates course access and issues the permanent ID. It does not approve lab access or award certification. Reading status is learner-confirmed, not independently proven.`);
    await interaction.editReply({ content: '', embeds: [embed], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cert:enrollment:approve:${studentDiscordId}`).setLabel('Confirm approval').setStyle(ButtonStyle.Success).setDisabled(!complete),
      new ButtonBuilder().setCustomId(`cert:enrollment:cancel:${studentDiscordId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    )], allowedMentions: { parse: [] } });
    return true;
  }
  const approval = await service.approveEnrollment(interaction.user.id, studentDiscordId);
  if (approval.alreadyApproved) {
    await reply(`Already approved. Permanent student ID: ${approval.studentId}. No new ID was issued or notification sent.`);
    return true;
  }
  let delivered = false;
  try {
    const student = await interaction.client.users.fetch(studentDiscordId);
    await student.send({ content: `Your NeptuneGuard certification enrollment has been approved.\nPermanent student ID: ${approval.studentId}\nCourse access is active. Hosted labs require a separate request and owner approval. This is enrollment, not a certificate award.`, allowedMentions: { parse: [] } });
    delivered = true;
  } catch {
    delivered = false;
  }
  await reply(`Enrollment approved. Permanent student ID: ${approval.studentId}.\n${delivered ? 'Student notification delivered by DM.' : 'DM delivery failed. Enrollment remains approved; arrange private ID delivery.'}`);
  return true;
}
