const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const uuid = '[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}';
const patterns = { open: /^cert:review:open:([0-9]{17,20})$/,
  choose: new RegExp(`^cert:review:choose:(approve|deny):(${uuid})$`),
  reason: new RegExp(`^cert:review:reason:(approve|deny):(${uuid})$`),
  confirm: new RegExp(`^cert:review:confirm:(${uuid})$`), cancel: new RegExp(`^cert:review:cancel:(${uuid})$`) };
const escape = value => value.replace(/[\\`*_~|<>@]/g, character => String.fromCharCode(92) + character);
const message = content => ({ content, allowedMentions: { parse: [] }, embeds: [], components: [] });

// Staged adapter only. No event listeners, runtime imports, publication, or activation.
// flow and onDiagnostic are trusted server dependencies, not interaction-provided values.
export function createManualReviewDecisionInteractionHandler(config, { guildId, flow, onDiagnostic = () => {} } = {}) {
  if (config?.enabled !== true || config.manualReviewEnabled !== true || config.manualReviewDecisionsEnabled !== true ||
      !validId(config.ownerId) || !validId(config.adminChannelId) || !validId(guildId) || typeof onDiagnostic !== 'function' ||
      !['open', 'choose', 'submit', 'confirm', 'cancel'].every(name => typeof flow?.[name] === 'function')) {
    throw new Error('Explicit enabled owner-decision adapter scope required');
  }
  const scope = Object.freeze({ ownerId: config.ownerId, guildId, channelId: config.adminChannelId });
  return async function handleOwnerDecision(interaction) {
    const customId = interaction?.customId;
    if (typeof customId !== 'string' || !customId.startsWith('cert:review:')) return false;
    if (interaction.deferred || interaction.replied) return true;
    let acknowledged = false, pendingToken = null, committed = false, phase = 'invalid';
    const context = { actorId: interaction.user?.id, actualGuildId: interaction.guildId, actualChannelId: interaction.channelId };
    const send = async payload => {
      const { flags, ...body } = payload;
      await interaction.editReply({ ...body, allowedMentions: { parse: [] } });
    };
    const reply = async content => {
      if (acknowledged || interaction.deferred) await send(message(content));
      else if (!interaction.replied) await interaction.reply({ ...message(content), flags: 64 });
    };
    const privateOrigin = () => interaction.message?.flags?.has?.(64) === true;
    const remember = payload => {
      const candidate = payload.components?.[0]?.components?.[0]?.custom_id?.split(':').at(-1);
      if (new RegExp(`^${uuid}$`).test(candidate || '')) pendingToken = candidate;
    };
    try {
      if (context.actorId !== scope.ownerId || context.actualGuildId !== scope.guildId || context.actualChannelId !== scope.channelId) {
        await reply('Owner authorization in the configured server and admin channel is required.');
        return true;
      }
      const route = Object.entries(patterns).map(([name, pattern]) => [name, pattern.exec(customId)]).find(([, match]) => match);
      if (!route) { await reply('Invalid owner review action.'); return true; }
      const [name, match] = route;
      phase = name;
      if ((name === 'reason' ? interaction.isModalSubmit?.() !== true : interaction.isButton?.() !== true) ||
          (name !== 'open' && !privateOrigin())) {
        await reply('Use the private owner review controls to continue.');
        return true;
      }
      if (name === 'choose') {
        pendingToken = match[2];
        const modal = flow.choose(context, { action: match[1], reviewToken: match[2] });
        await interaction.showModal(modal);
        pendingToken = null;
        return true;
      }
      await interaction.deferReply({ flags: 64 });
      acknowledged = true;
      if (name === 'open') {
        const payload = await flow.open(context, match[1]);
        remember(payload);
        await send(payload);
        pendingToken = null;
      } else if (name === 'reason') {
        const payload = flow.submit(context, { action: match[1], reviewToken: match[2],
          reason: interaction.fields.getTextInputValue('reason'), reviewAck: interaction.fields.getTextInputValue('review_ack') });
        remember(payload);
        await send(payload);
        pendingToken = null;
      } else if (name === 'cancel') {
        const canceled = flow.cancel(context, match[1]);
        await reply(canceled ? 'Confirmation canceled. No decision was executed by this cancellation.'
          : 'Confirmation unavailable. Inspect current enrollment status before starting another review.');
      } else {
        const result = await flow.confirm(context, match[1]);
        committed = true;
        if (!['approved', 'denied'].includes(result?.status)) throw new Error('Unexpected decision result');
        const permanentId = result.studentId == null ? 'Not issued' :
          typeof result.studentId === 'string' && result.studentId.trim() && result.studentId.length <= 100 ? escape(result.studentId) : 'Inspect learner record';
        await reply(`Enrollment decision committed: ${result.status}.\nPermanent ID: ${permanentId}\nSubmitted responses remain unchanged. No automatic comprehension pass, lab authorization, or certificate issuance was performed.`);
      }
      return true;
    } catch (error) {
      if (pendingToken) { try { flow.cancel(context, pendingToken); } catch {} }
      const uncertain = error?.code === 'MANUAL_REVIEW_DECISION_OUTCOME_UNCONFIRMED';
      const outcome = committed ? 'committed_delivery_unconfirmed' : uncertain ? 'outcome_unconfirmed' : 'request_failed';
      try { onDiagnostic(Object.freeze({ event: 'owner_manual_review_interaction_failure', phase, outcome })); } catch {}
      const content = committed
        ? 'The decision service returned a committed result, but its result message could not be confirmed. Inspect the learner record and audit history; do not repeat the decision because of a message failure.'
        : uncertain || phase === 'confirm'
          ? 'Decision outcome is not confirmed. Inspect enrollment status and audit history before any new decision. Do not retry automatically.'
          : 'Owner review unavailable or expired. Open a fresh owner review. No decision was executed by this request.';
      try { await reply(content); } catch {}
      return true;
    }
  };
}
