// Offline synthetic prototype only. Never import into academy runtime.
import { randomUUID } from 'node:crypto';

const DEMO = /^demo-[a-z0-9-]{1,40}$/;
const CURSORS = ['overview', 'lesson', 'help'];
const binding = value => ({ actorId: value?.actorId, workspaceId: value?.workspaceId,
  courseKey: value?.courseKey, messageId: value?.messageId, privateWorkspace: value?.privateWorkspace });
const valid = value => value.privateWorkspace === true && value.courseKey === 'demo-ethical-hacking' &&
  [value.actorId, value.workspaceId, value.messageId].every(item => typeof item === 'string' && DEMO.test(item));
const same = (a, b) => ['actorId', 'workspaceId', 'courseKey', 'messageId', 'privateWorkspace'].every(key => a[key] === b[key]);
const denied = () => ({ ok: false, reason: 'unavailable', payload: {
  content: 'Synthetic workspace unavailable.', components: [], allowedMentions: { parse: [] } } });

export function createSyntheticWorkspace({ authorize, loadPage, now = Date.now, ttlMs = 30000, maxSessions = 20 } = {}) {
  if (typeof authorize !== 'function' || typeof loadPage !== 'function' || typeof now !== 'function' ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 60000 ||
      !Number.isSafeInteger(maxSessions) || maxSessions < 1 || maxSessions > 100) throw new Error('Explicit bounded demo dependencies required');
  const sessions = new Map();
  let disposed = false;
  const stamp = () => { const value = now();
    if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - ttlMs) throw new Error('Invalid demo clock');
    return value;
  };
  const live = session => !disposed && sessions.get(session.token) === session && stamp() < session.expiresAt;
  const purge = () => { const time = stamp(); for (const [token, session] of sessions) if (time >= session.expiresAt) sessions.delete(token); };
  async function deliver(session, cursor) {
    try {
      if (!live(session) || await authorize(session.context) !== true || !live(session)) throw new Error('Denied');
      const page = await loadPage({ courseKey: session.context.courseKey, cursor });
      if (!page || typeof page.title !== 'string' || page.title.length > 120 || typeof page.body !== 'string' || page.body.length > 3000) throw new Error('Invalid demo page');
      if (!live(session) || await authorize(session.context) !== true || !live(session)) throw new Error('Denied');
      return { ok: true, sessionToken: session.token, operation: 'edit-existing-private-message',
        messageId: session.context.messageId, visibility: 'private-required',
        grantsAccess: false, progressSaved: false, evidenceCollected: false,
        payload: { content: '', embeds: [{ title: page.title, description: page.body,
          footer: { text: 'Synthetic read-only prototype. No evidence, saved progress or awards.' } }],
          components: [{ type: 1, components: CURSORS.map(next => ({ type: 2, style: 2,
            custom_id: `formal-demo:${session.token}:${next}`, label: next })) }], allowedMentions: { parse: [] } } };
    } catch { sessions.delete(session.token); return denied(); }
  }
  return Object.freeze({
    async open(context) {
      try {
        const bound = binding(context);
        if (disposed || !valid(bound)) return denied();
        purge(); if (sessions.size >= maxSessions) return denied();
        const session = { token: randomUUID(), context: Object.freeze(bound), expiresAt: stamp() + ttlMs };
        sessions.set(session.token, session);
        return await deliver(session, 'overview');
      } catch { return denied(); }
    },
    async navigate(input) {
      try {
        const bound = binding(input), session = sessions.get(input?.token);
        if (disposed || !session || !valid(bound) || !same(bound, session.context) || !CURSORS.includes(input?.cursor)) return denied();
        return await deliver(session, input.cursor);
      } catch { return denied(); }
    },
    dispose() { disposed = true; sessions.clear(); }
  });
}
