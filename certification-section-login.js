import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createSectionIdentityVerifier } from './certification-section-identity.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';

export function createSectionLoginHandler(pool, config, guildId, { sections, onVerified, now = Date.now, ttlMs = 300000, maxPending = 1000 } = {}) {
  if (typeof onVerified !== 'function' || typeof now !== 'function' || !Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 300000 ||
      !Number.isSafeInteger(maxPending) || maxPending < 1 || maxPending > 1000) throw new Error('Invalid section login configuration');
  const verifier = createSectionIdentityVerifier(pool, config, guildId, { sections, readLimits: { now } });
  const allowed = new Set(sections), pending = new Map(), openings = createStatusReadGuard({ now });
  return async function handleSectionLogin(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('cert:section:')) return false;
    const deny = () => {
      const payload = { content: 'Section entry could not be verified. Reopen the section entry button and check your current enrollment status.', embeds: [], components: [], allowedMentions: { parse: [] } };
      return interaction.deferred || interaction.replied ? interaction.editReply(payload) : interaction.reply({ ...payload, flags: 64 });
    };
    const actor = interaction.user?.id, origin = interaction.message?.interactionMetadata?.user?.id || interaction.message?.interaction?.user?.id;
    const privateSource = interaction.message?.flags?.has?.(64) === true;
    if (config.enabled !== true || interaction.guildId !== guildId || !/^\d{17,20}$/.test(actor || '') || (privateSource && origin && origin !== actor)) {
      await deny(); return true;
    }
    const time = now();
    for (const [token, challenge] of pending) if (challenge.expiresAt <= time) pending.delete(token);
    const open = /^cert:section:open:([a-z0-9][a-z0-9-]{0,39})$/.exec(id);
    if (interaction.isButton?.() && open && allowed.has(open[1])) {
      try {
        await openings.run(actor, async () => {
          for (const [token, challenge] of pending) if (challenge.actor === actor) pending.delete(token);
          if (pending.size >= maxPending) throw new Error('Section login capacity reached');
          const token = randomUUID(); pending.set(token, { actor, guildId, section: open[1], expiresAt: now() + ttlMs });
          const modal = new ModalBuilder().setCustomId(`cert:section:submit:${token}`).setTitle('Confirm section entry').addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('student_id').setLabel('Your permanent student ID').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(100))
          );
          try { await interaction.showModal(modal); } catch (error) { pending.delete(token); throw error; }
        });
      } catch { await deny(); }
      return true;
    }
    const submit = /^cert:section:submit:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(id);
    const challenge = submit && pending.get(submit[1]);
    if (!interaction.isModalSubmit?.() || !challenge || challenge.actor !== actor || challenge.guildId !== interaction.guildId) {
      await deny(); return true;
    }
    pending.delete(submit[1]);
    try {
      await interaction.deferReply({ flags: 64 });
      const studentId = interaction.fields.getTextInputValue('student_id');
      const verified = await verifier.verify({ discordUserId: actor, guildId: interaction.guildId, studentId, section: challenge.section });
      if (!verified || now() >= challenge.expiresAt || config.enabled !== true) { await deny(); return true; }
      await onVerified(interaction, challenge.section);
    } catch { await deny(); }
    return true;
  };
}
