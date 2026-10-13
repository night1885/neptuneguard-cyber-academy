import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { hasCompleteTypedAcknowledgment } from './certification-acknowledgment.js';
import { hasCurrentAgeEligibility } from './certification-age-evidence.js';

export async function handleEnrollmentAction(interaction, pool, config, guildId, service) {
  if (!interaction.isButton() || !interaction.customId.startsWith('cert:enrollment:')) return false;
  await interaction.deferReply({ flags: 64 });
  const reply = content => interaction.editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } });
  if (!config.enabled || interaction.user.id !== config.ownerId || interaction.guildId !== guildId) {
    await reply('Owner authorization in the configured server is required.'); return true;
  }
  const match = /^cert:enrollment:(review|approve|cancel):(\d{17,20})$/.exec(interaction.customId);
  if (!match) { await reply('Invalid enrollment action.'); return true; }
  const [, action, studentDiscordId] = match;
  if (action === 'cancel') { await reply('Approval canceled. No enrollment was changed.'); return true; }
  if (action === 'review') {
    const row = (await pool.query(`SELECT status, agreement_version, acknowledged_at, signature_method, acknowledgment_name, learner_confirmed_read_at, comprehension_passed_at, age_eligibility_confirmed, age_eligibility_confirmed_at, age_policy_version FROM certification_enrollments WHERE discord_user_id=$1`, [studentDiscordId])).rows[0];
    if (!row || row.status !== 'pending') { await reply('This request is not pending. Refresh the queue.'); return true; }
    const acknowledgmentComplete = hasCompleteTypedAcknowledgment(row);
    const ageComplete = hasCurrentAgeEligibility(row);
    const safe = value => String(value ?? 'Not supplied').replace(/[`*_~|<>]/g, '').slice(0, 100);
    const embed = new EmbedBuilder().setColor(0xf1c40f).setTitle('Confirm enrollment approval')
      .setDescription(`Student Discord ID: ${studentDiscordId}\nAgreement: ${safe(row.agreement_version)}\nAcknowledgment method: ${safe(row.signature_method)}\nAcknowledgment complete: ${acknowledgmentComplete ? 'Yes' : 'No'}\nAge eligibility — self-reported 16+: ${ageComplete ? 'Current confirmation present' : 'Missing or requires fresh confirmation'}\nAge policy: ${safe(row.age_policy_version)}\nAge confirmation time: ${safe(row.age_eligibility_confirmed_at)}\n\nNo uploaded agreement document or parental-consent step is required by the selected policy. Approval activates course access and issues the permanent ID. It does not approve lab access or award certification. Reading and age are learner-reported, not independently verified.`);
    await interaction.editReply({ content: '', embeds: [embed], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cert:enrollment:approve:${studentDiscordId}`).setLabel('Confirm approval').setStyle(ButtonStyle.Success).setDisabled(!acknowledgmentComplete || !ageComplete),
      new ButtonBuilder().setCustomId(`cert:enrollment:cancel:${studentDiscordId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    )], allowedMentions: { parse: [] } }); return true;
  }
  const approval = await service.approveEnrollment(interaction.user.id, studentDiscordId);
  if (approval.alreadyApproved) {
    await reply(`Already approved. Permanent student ID: ${approval.studentId}. No new ID was issued or notification sent.`); return true;
  }
  let delivered = false;
  try {
    const student = await interaction.client.users.fetch(studentDiscordId);
    await student.send({ content: `Your NeptuneGuard certification enrollment has been approved.\nPermanent student ID: ${approval.studentId}\nCourse access is active. Hosted labs require a separate request and owner approval. This is enrollment, not a certificate award.`, allowedMentions: { parse: [] } });
    delivered = true;
  } catch { delivered = false; }
  await reply(`Enrollment approved. Permanent student ID: ${approval.studentId}.\n${delivered ? 'Student notification delivered by DM.' : 'DM delivery failed. Enrollment remains approved; arrange private ID delivery.'}`);
  return true;
}
