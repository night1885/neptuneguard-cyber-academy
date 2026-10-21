import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createOwnerRegistrationService } from './certification-owner-registration.js';

export function createOwnerRegistrationHandler(pool, config, guildId, { now = Date.now, createRegistrationService = createOwnerRegistrationService } = {}) {
  if (typeof createRegistrationService !== 'function') throw new Error('Trusted owner registration service factory required');
  const service = createRegistrationService(pool, config);
  const registrationEntry = config.registrationPilotEnabled === true
    ? 'Next step: after a pilot registration entry is separately approved and published, ask the learner to open it in this server.'
    : 'Next step: ask the learner to run /start in this server and open Registration / application console.';
  const pending = new Map();
  const row = (...items) => new ActionRowBuilder().addComponents(items);
  const button = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
  return async function handleOwnerRegistration(interaction) {
    const id = interaction.customId || '';
    if (!(interaction.isButton?.() || interaction.isModalSubmit?.()) || !id.startsWith('cert:register:')) return false;
    const reply = content => interaction.reply({ content, flags: 64, allowedMentions: { parse: [] } });
    if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
      await reply('Admin authorization in the configured server is required.'); return true;
    }
    const timestamp = now();
    for (const [token, record] of pending) if (record.expiresAt <= timestamp) pending.delete(token);
    if (id === 'cert:register:open' && interaction.isButton()) {
      const modal = new ModalBuilder().setCustomId('cert:register:submit').setTitle('Register student');
      modal.addComponents(row(new TextInputBuilder().setCustomId('discord_user_id').setLabel('Student Discord user ID').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(17).setMaxLength(20)));
      await interaction.showModal(modal); return true;
    }
    if (id === 'cert:register:submit' && interaction.isModalSubmit()) {
      const studentId = interaction.fields.getTextInputValue('discord_user_id').trim();
      if (!/^\d{17,20}$/.test(studentId)) { await reply('Enter a numeric Discord user ID of 17–20 digits.'); return true; }
      if (pending.size >= 100) { await reply('Too many pending registrations. Retry after five minutes.'); return true; }
      const token = randomUUID();
      pending.set(token, { actorId: interaction.user.id, studentId, expiresAt: timestamp + 300000 });
      await interaction.reply({ content: `Register Discord user ${studentId}? New records await learner acknowledgment. Existing records remain unchanged. This does not grant access, issue a permanent ID, accept agreements, or send a DM.`, flags: 64, allowedMentions: { parse: [] }, components: [row(button(`cert:register:confirm:${token}`, 'Confirm registration', ButtonStyle.Success), button(`cert:register:cancel:${token}`, 'Cancel'))] });
      return true;
    }
    const match = /^cert:register:(confirm|cancel):([a-f0-9-]{36})$/.exec(id);
    if (!match || !interaction.isButton()) { await reply('Invalid registration action.'); return true; }
    const record = pending.get(match[2]);
    if (!record || record.actorId !== interaction.user.id) { await reply('Confirmation expired or was invalidated by a restart. Start again.'); return true; }
    pending.delete(match[2]);
    if (match[1] === 'cancel') { await reply('Registration canceled. No record changed.'); return true; }
    await interaction.deferReply({ flags: 64 });
    const result = await service.register(record.actorId, record.studentId);
    await interaction.editReply({ content: result.created ? `Registered Discord user ${record.studentId}; awaiting learner acknowledgment. Course access is not active.\n\n${registrationEntry} With the agreement manifest configured, eligible admin-registered learners can complete invited registration while general enrollment remains closed. The learner must complete their own acknowledgment and declarations, then await a separate admin decision. No DM was sent.` : `A record already exists for Discord user ${record.studentId}. No record or access was changed.`, allowedMentions: { parse: [] }, components: [row(button(`cert:students:detail:${record.studentId}`, 'Open student record'))] });
    return true;
  };
}
