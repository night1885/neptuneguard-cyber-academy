import { randomUUID } from 'node:crypto';
import { createCertificationLabManagement } from './certification-lab-management.js';
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const button = (custom_id, label, style = 2) => ({ type: 2, style, custom_id, label });
const row = (...components) => ({ type: 1, components });
const safe = value => String(value).replace(/[`*_~|<>@]/g, '');
export function buildLabActionControls(requestId, status) {
  if (!new RegExp(`^${uuid}$`).test(requestId)) throw new Error('Invalid lab request ID');
  const action = status === 'pending' ? 'deny' : ['approved', 'suspended'].includes(status) ? 'revoke' : null;
  return action ? [row(button(`cert:labact:${action}:${requestId}`, action === 'deny' ? 'Deny lab request' : 'Revoke lab authorization', 4))] : [];
}
export function createLabActionHandler(pool, config, guildId, { now = Date.now, service = createCertificationLabManagement(pool, config) } = {}) {
  const pending = new Map();
  return async function handleLabAction(interaction) {
    const id = interaction.customId || '';
    if (!(interaction.isButton?.() || interaction.isModalSubmit?.()) || !id.startsWith('cert:labact:')) return false;
    const reply = content => interaction.reply({ content, flags: 64, allowedMentions: { parse: [] } });
    if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
      await reply('Owner authorization in the configured server is required.'); return true;
    }
    const timestamp = now();
    for (const [key, value] of pending) if (value.expiresAt <= timestamp) pending.delete(key);
    const confirmation = new RegExp(`^cert:labact:(confirm|cancel):(${uuid})$`).exec(id);
    if (confirmation && interaction.isButton()) {
      const record = pending.get(confirmation[2]);
      if (!record || record.actorId !== interaction.user.id) { await reply('Confirmation expired or was invalidated by a restart. Start again.'); return true; }
      pending.delete(confirmation[2]);
      if (confirmation[1] === 'cancel') { await reply('Canceled. No lab authorization changed.'); return true; }
      await interaction.deferReply({ flags: 64 });
      const result = await service.changeLabStatus(record.actorId, record.requestId, record.action, record.reason);
      await interaction.editReply({ content: `Request: ${result.requestId}\nStored authorization status: ${result.status}.\n${result.alreadyApplied ? 'The target status was already recorded; no new status write or audit event was created.' : 'Authorization change and audit event committed.'}\n${result.sessionTerminationRequired ? 'Provider-session termination still requires reconciliation. This action did not terminate a running session.' : 'No lab access was granted and no provider session was launched.'}`, components: [], allowedMentions: { parse: [] } });
      return true;
    }
    const action = new RegExp(`^cert:labact:(deny|revoke):(${uuid})$`).exec(id);
    if (!action) { await reply('Invalid lab-management action. Refresh the request.'); return true; }
    if (interaction.isButton()) {
      await interaction.showModal({ custom_id: id, title: action[1] === 'deny' ? 'Deny lab request' : 'Revoke lab authorization', components: [row({ type: 4, custom_id: 'reason', label: 'Reason for this authorization change', style: 2, required: true, max_length: 1000 })] }); return true;
    }
    const reason = interaction.fields.getTextInputValue('reason').trim();
    if (!reason || reason.length > 1000) { await reply('A reason of 1–1000 characters is required.'); return true; }
    if (pending.size >= 100) { await reply('Too many pending confirmations. Cancel one or retry after five minutes.'); return true; }
    await interaction.deferReply({ flags: 64 });
    const record = (await pool.query('SELECT request_id, discord_user_id, status FROM certification_lab_requests WHERE request_id=$1::uuid', [action[2]])).rows[0];
    const permitted = action[1] === 'deny' ? ['pending'] : ['approved', 'suspended'];
    if (!record || !permitted.includes(record.status)) {
      await interaction.editReply({ content: 'Request is missing or its status no longer permits this action. Refresh Lab records.', components: [], allowedMentions: { parse: [] } }); return true;
    }
    const token = randomUUID();
    pending.set(token, { actorId: interaction.user.id, requestId: action[2], action: action[1], reason, expiresAt: now() + 300000 });
    await interaction.editReply({ content: `Confirm ${action[1]} for lab request ${safe(record.request_id)}?\nStudent Discord ID: ${safe(record.discord_user_id)}\nCurrent stored status: ${safe(record.status)}\nReason: ${safe(reason)}\n\nOnly this authorization record will change. Course enrollment and permanent student ID are unchanged. No provider session will be launched or terminated. Confirmation expires in five minutes.`, components: [row(button(`cert:labact:confirm:${token}`, 'Confirm authorization change', 4), button(`cert:labact:cancel:${token}`, 'Cancel'))], allowedMentions: { parse: [] } });
    return true;
  };
}
