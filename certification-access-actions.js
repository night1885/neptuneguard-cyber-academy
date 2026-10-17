import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createCertificationAccessManagement } from './certification-access-management.js';

export function buildAccessControls(studentId, status) {
  const actions = { pending: ['deny'], approved: ['suspend', 'revoke'], suspended: ['revoke', 'reinstate'], revoked: ['reinstate'] }[status] || [];
  if (!/^\d{17,20}$/.test(studentId)) throw new Error('Invalid student Discord ID');
  return actions.length ? [new ActionRowBuilder().addComponents(actions.map(action =>
    new ButtonBuilder().setCustomId(`cert:access:${action}:${studentId}`).setLabel(action)
      .setStyle(action === 'reinstate' ? ButtonStyle.Success : ButtonStyle.Danger)))] : [];
}

export function createAccessActionHandler(pool, config, guildId, { now = Date.now } = {}) {
  if (typeof now !== 'function') throw new Error('Invalid access-confirmation clock');
  const service = createCertificationAccessManagement(pool, config);
  const pending = new Map();
  return async function handleAccessAction(interaction) {
    if (!(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId.startsWith('cert:access:')) return false;
    const respond = payload => interaction.reply({ flags: 64, allowedMentions: { parse: [] }, ...payload });
    if (!config.enabled || interaction.user.id !== config.ownerId || interaction.guildId !== guildId) {
      await respond({ content: 'Admin authorization in the configured server is required.' }); return true;
    }
    const timestamp = now();
    for (const [key, value] of pending) if (value.expiresAt <= timestamp) pending.delete(key);
    const confirm = /^cert:access:(confirm|cancel):([a-f0-9-]{36})$/.exec(interaction.customId);
    if (confirm && interaction.isButton()) {
      const record = pending.get(confirm[2]);
      if (!record || record.actorId !== interaction.user.id) {
        await respond({ content: 'Confirmation expired or was invalidated by a restart. Start again.' }); return true;
      }
      pending.delete(confirm[2]);
      if (confirm[1] === 'cancel') { await respond({ content: 'Canceled. No access record changed.' }); return true; }
      await interaction.deferReply({ flags: 64 });
      const result = await service.changeEnrollmentStatus(record.actorId, record.studentId, record.action, record.reason);
      await interaction.editReply({ content: `Enrollment status: ${result.status}. Student ID preserved: ${result.studentId || 'Not issued'}.\nLab permissions revoked: ${result.revokedLabRequests.length}.\n${result.sessionTerminationRequired ? 'Running lab termination requires the lab provider; this action only changed authorization records.' : 'Lab permissions were not restored.'}`, components: [], allowedMentions: { parse: [] } });
      return true;
    }
    const action = /^cert:access:(deny|suspend|revoke|reinstate):(\d{17,20})$/.exec(interaction.customId);
    if (!action) { await respond({ content: 'Invalid access action.' }); return true; }
    if (interaction.isButton()) {
      const modal = new ModalBuilder().setCustomId(interaction.customId).setTitle(`${action[1]} enrollment`);
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('reason').setLabel('Reason for this access change').setStyle(TextInputStyle.Paragraph)
        .setRequired(true).setMaxLength(1000)));
      await interaction.showModal(modal); return true;
    }
    const reason = interaction.fields.getTextInputValue('reason').trim();
    if (!reason || reason.length > 1000) { await respond({ content: 'A reason of 1–1000 characters is required.' }); return true; }
    if (pending.size >= 100) { await respond({ content: 'Too many pending confirmations. Cancel one or retry after five minutes.' }); return true; }
    const token = randomUUID();
    pending.set(token, { actorId: interaction.user.id, studentId: action[2], action: action[1], reason, expiresAt: timestamp + 300000 });
    const displayReason = reason.replace(/[`*_~|<>]/g, '');
    await respond({ content: `Confirm ${action[1]} for Discord user ${action[2]}?\nReason: ${displayReason}\nPermanent student ID will be preserved. Suspension or revocation also revokes lab requests.`, components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cert:access:confirm:${token}`).setLabel('Confirm change').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`cert:access:cancel:${token}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary))
    ] });
    return true;
  };
}
