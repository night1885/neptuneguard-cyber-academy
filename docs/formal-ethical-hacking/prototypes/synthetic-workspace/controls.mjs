// Offline synthetic controls only. No Discord transport or runtime integration.
import { randomUUID } from 'node:crypto';
const FIELDS = ['actorId', 'workspaceId', 'courseKey', 'messageId', 'privateWorkspace'];
const demo = value => typeof value === 'string' && /^demo-[a-z0-9-]{1,40}$/.test(value);
const denied = () => ({ ok: false, reason: 'unavailable' });
const base = ctx => ({ actorId: ctx.actorId, workspaceId: ctx.workspaceId, courseKey: ctx.courseKey, privateWorkspace: true });
function bind(input) {
  if (!input || Object.keys(input).some(key => ![...FIELDS, 'customId'].includes(key)) || input.privateWorkspace !== true ||
      input.courseKey !== 'demo-ethical-hacking' || ![input.actorId, input.workspaceId, input.messageId].every(demo)) throw new Error('Invalid demo control context');
  return Object.freeze(Object.fromEntries(FIELDS.map(key => [key, input[key]])));
}

export function createSyntheticControls({ store, authorize, now = Date.now, ttlMs = 30000, maxControls = 100 } = {}) {
  if (!store || !['read', 'submit', 'review'].every(key => typeof store[key] === 'function') || typeof authorize !== 'function' ||
      typeof now !== 'function' || !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 60000 ||
      !Number.isSafeInteger(maxControls) || maxControls < 1 || maxControls > 100) throw new Error('Explicit bounded demo control dependencies required');
  const entries = new Map(); let disposed = false;
  const stamp = () => { const time = now(); if (!Number.isSafeInteger(time) || time < 0 || time > Number.MAX_SAFE_INTEGER - ttlMs) throw new Error('Invalid clock'); return time; };
  const live = entry => !disposed && entries.get(entry.token) === entry && stamp() < entry.expiresAt;
  const permission = (ctx, action, record) => authorize(Object.freeze({ ...ctx, action, recordId: record.id, ownerId: record.ownerId }));
  return Object.freeze({
    async build(input, recordId) {
      try {
        const ctx = bind(input); if (disposed) return denied();
        const time = stamp(); for (const [token, entry] of entries) if (time >= entry.expiresAt) entries.delete(token);
        const found = await store.read(base(ctx), recordId); if (!found.ok || disposed) return denied();
        const record = found.record, owner = ctx.actorId === record.ownerId;
        const options = owner && ['working', 'changes-requested'].includes(record.status)
          ? [{ action: 'submit', label: 'Submit demo reference' }]
          : !owner && record.status === 'submitted' ? [
            { action: 'review', decision: 'changes-requested', label: 'Request demo changes' },
            { action: 'review', decision: 'review-recorded', label: 'Record demo review' }] : [];
        const allowed = [];
        for (const option of options) if (await permission(ctx, option.action, record) === true) allowed.push(option);
        const checked = await store.read(base(ctx), recordId);
        if (disposed || !checked.ok || checked.record.revision !== record.revision || entries.size + allowed.length > maxControls) return denied();
        const buttons = allowed.map(option => {
          const token = randomUUID(), command = { recordId: record.id, expectedRevision: record.revision, requestId: 'demo-' + token };
          if (option.action === 'submit') command.evidenceRef = 'demo-evidence-a';
          else { command.decision = option.decision; command.feedbackRef = 'demo-feedback-a'; }
          entries.set(token, { token, context: ctx, action: option.action, command: Object.freeze(command), expiresAt: stamp() + ttlMs });
          return { type: 2, style: 2, custom_id: 'formal-demo-action:' + token, label: option.label };
        });
        return { ok: true, messageId: ctx.messageId, operation: 'edit-existing-private-message', visibility: 'private-required',
          components: buttons.length ? [{ type: 1, components: buttons }] : [], allowedMentions: { parse: [] } };
      } catch { return denied(); }
    },
    async press(input) {
      try {
        const ctx = bind(input), match = /^formal-demo-action:([a-f0-9-]{36})$/.exec(input.customId || '');
        const entry = match && entries.get(match[1]);
        if (!entry || !FIELDS.every(key => ctx[key] === entry.context[key]) || !live(entry)) return denied();
        const found = await store.read(base(ctx), entry.command.recordId);
        if (!found.ok || await permission(ctx, entry.action, found.record) !== true || !live(entry)) return denied();
        const result = await store[entry.action](base(ctx), entry.command);
        return result.ok ? { ...result, messageId: ctx.messageId, operation: 'edit-existing-private-message' } : result;
      } catch { return denied(); }
    },
    dispose() { disposed = true; entries.clear(); }
  });
}
