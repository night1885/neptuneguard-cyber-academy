import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { hasManualReviewAcknowledgment, ownerManualReviewEmbed } from './certification-manual-review-data.mjs';

const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const version = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
const escape = value => value.replace(/[\\`*_~|<>@]/g, character => String.fromCharCode(92) + character);
function checkedToken(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value)) throw new Error('Valid server-held review token required');
  return value;
}
function checkedAction(value) {
  if (!['approve', 'deny'].includes(value)) throw new Error('Explicit approval or denial required');
  return value;
}
const button = (customId, label, style) => new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
const row = (...buttons) => new ActionRowBuilder().addComponents(buttons);
const reply = (embeds, components) => ({ flags: 64, content: '', allowedMentions: { parse: [] },
  embeds: embeds.map(embed => new EmbedBuilder(embed).toJSON()), components: components.map(component => component.toJSON()) });

// Staged presentation only: callers must use server-held records and tokens, never interaction JSON.
// No handlers, database access, message sending, or runtime activation are included.
export function createManualReviewDecisionPresentation(config, { guildId } = {}) {
  if (config?.enabled !== true || config.manualReviewEnabled !== true || config.manualReviewDecisionsEnabled !== true ||
      !id(config.ownerId) || !id(config.adminChannelId) || !id(guildId) || !version(config.activeAgreementVersion) ||
      !/^[a-f0-9]{64}$/.test(config.activeAgreementSha256 || '') || !version(config.comprehensionCheck?.version)) {
    throw new Error('Explicit enabled owner-decision presentation scope required');
  }
  const scope = Object.freeze({ enabled: true, ownerId: config.ownerId, channelId: config.adminChannelId, guildId,
    agreementVersion: config.activeAgreementVersion, agreementHash: config.activeAgreementSha256, checkVersion: config.comprehensionCheck.version });
  function authorize(context) {
    if (context?.actorId !== scope.ownerId || context.actualGuildId !== scope.guildId || context.actualChannelId !== scope.channelId) {
      throw new Error('Owner authorization in the configured server and admin channel required');
    }
  }
  return Object.freeze({
    review(context, { record, reviewToken } = {}) {
      authorize(context);
      checkedToken(reviewToken);
      if (!hasManualReviewAcknowledgment(record) || record.status !== 'pending' || record.approved_by != null || record.approved_at != null ||
          record.agreement_version !== scope.agreementVersion || record.agreement_content_sha256 !== scope.agreementHash ||
          record.comprehension_check_version !== scope.checkVersion ||
          (record.student_id != null && (typeof record.student_id !== 'string' || !record.student_id.trim() || record.student_id.length > 100))) {
        throw new Error('Current pending manual-review application required');
      }
      const summary = new EmbedBuilder().setTitle('Review pending application').setColor(0xf1c40f)
        .setDescription(`Discord ID: ${record.discord_user_id}\nPermanent ID: ${record.student_id == null ? 'Not issued' : escape(record.student_id)}\nStatus: Awaiting owner review (not approved).\n\nInspect the submitted responses and captured guide below. Recorded declarations are self-declared, not independent verification. No automatic comprehension pass is implied.`)
        .setFooter({ text: 'These buttons open review forms; they do not change enrollment.' });
      const responses = ownerManualReviewEmbed(record.comprehension_review_snapshot, scope, context.actorId, context.actualGuildId, scope.guildId);
      return reply([summary.toJSON(), responses], [row(
        button(`cert:review:choose:approve:${reviewToken}`, 'Approve...', ButtonStyle.Success),
        button(`cert:review:choose:deny:${reviewToken}`, 'Deny...', ButtonStyle.Danger))]);
    },
    reasonModal(context, { reviewToken, action } = {}) {
      authorize(context);
      checkedToken(reviewToken);
      checkedAction(action);
      const field = (key, label, style, max) => row(new TextInputBuilder().setCustomId(key).setLabel(label).setStyle(style).setRequired(true).setMaxLength(max));
      return new ModalBuilder().setCustomId(`cert:review:reason:${action}:${reviewToken}`)
        .setTitle(action === 'approve' ? 'Review approval' : 'Review denial')
        .addComponents(field('reason', 'Reason for this decision', TextInputStyle.Paragraph, 1000),
          field('review_ack', 'Type REVIEWED after inspecting responses', TextInputStyle.Short, 8)).toJSON();
    },
    confirmation(context, { issued, reason } = {}) {
      authorize(context);
      checkedToken(issued?.token);
      checkedAction(issued?.action);
      if (!id(issued.studentDiscordId) || !Number.isSafeInteger(issued.expiresAt) || issued.expiresAt < 0 || issued.expiresAt > 8640000000000000 ||
          typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw new Error('Complete server-held decision details required');
      // reason must be the same server-held input passed to service.prepare(), normalized with trim().
      const approved = issued.action === 'approve';
      const effects = approved
        ? 'Approval changes stored enrollment to approved and issues or preserves the permanent student ID. It can satisfy enrollment prerequisites for course access; actual availability remains subject to runtime gates. It does not authorize labs or issue a certificate.'
        : 'Denial changes stored enrollment to denied and records the reason. It does not issue a new permanent ID. Any existing permanent ID is preserved. No access is granted.';
      const embed = new EmbedBuilder().setTitle(approved ? 'Confirm enrollment approval' : 'Confirm enrollment denial')
        .setColor(approved ? 0x2ecc71 : 0xe74c3c)
        .setDescription(`Discord ID: ${issued.studentDiscordId}\nDecision: ${issued.action}\nConfirmation expires: ${new Date(issued.expiresAt).toISOString()}\n\n${effects}\n\nSubmitted responses remain unchanged. No automatic comprehension pass is recorded.`)
        .setFooter({ text: 'Owner-only. No change occurs until the final confirmation is accepted and committed.' });
      const normalized = reason.trim(), pieces = [];
      for (let start = 0; start < normalized.length; start += 500) pieces.push(escape(normalized.slice(start, start + 500)));
      pieces.forEach((value, index) => embed.addFields({ name: pieces.length === 1 ? 'Decision reason' : `Decision reason (${index + 1}/${pieces.length})`, value }));
      return reply([embed.toJSON()], [row(
        button(`cert:review:confirm:${issued.token}`, approved ? 'Confirm approval' : 'Confirm denial', approved ? ButtonStyle.Success : ButtonStyle.Danger),
        button(`cert:review:cancel:${issued.token}`, 'Cancel', ButtonStyle.Secondary))]);
    }
  });
}
