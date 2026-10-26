// Synthetic in-memory review model only. Never import into academy runtime.
import { randomUUID } from 'node:crypto';
const demo = value => typeof value === 'string' && /^demo-[a-z0-9-]{1,40}$/.test(value);
const deny = () => ({ ok: false, reason: 'unavailable' });
const conflict = () => ({ ok: false, reason: 'conflict' });
const view = record => ({ ok: true, record: structuredClone(record), persisted: false,
  evidenceCollected: false, grantsAccess: false, awardsIssued: false });

export function createSyntheticReviewStore({ authorize } = {}) {
  if (typeof authorize !== 'function') throw new Error('Explicit demo authorizer required');
  const records = new Map(), requests = new Map();
  let queue = Promise.resolve(), disposed = false;
  const run = operation => {
    const result = queue.then(async () => { try { return disposed ? deny() : await operation(); } catch { return deny(); } });
    queue = result.then(() => undefined, () => undefined);
    return result;
  };
  function context(input) {
    const allowed = ['actorId', 'workspaceId', 'courseKey', 'privateWorkspace'];
    if (!input || Object.keys(input).some(key => !allowed.includes(key)) || !demo(input.actorId) ||
        !demo(input.workspaceId) || input.courseKey !== 'demo-ethical-hacking' || input.privateWorkspace !== true) throw new Error('Invalid demo context');
    return Object.freeze({ actorId: input.actorId, workspaceId: input.workspaceId,
      courseKey: input.courseKey, privateWorkspace: true });
  }
  function find(ctx, id) {
    const record = records.get(id);
    if (!record || record.workspaceId !== ctx.workspaceId || record.courseKey !== ctx.courseKey) throw new Error('Unavailable');
    return record;
  }
  async function permit(ctx, action, record) {
    if (disposed || await authorize(Object.freeze({ ...ctx, action, recordId: record.id, ownerId: record.ownerId })) !== true || disposed) throw new Error('Unavailable');
  }
  async function mutate(input, command, action) {
    const ctx = context(input);
    const keys = ['recordId', 'expectedRevision', 'requestId', ...(action === 'submit' ? ['evidenceRef'] : ['decision', 'feedbackRef'])];
    if (!command || Object.keys(command).some(key => !keys.includes(key)) || !demo(command.requestId) ||
        !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0 || command.expectedRevision >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid command');
    const data = { recordId: command.recordId, expectedRevision: command.expectedRevision, requestId: command.requestId,
      evidenceRef: command.evidenceRef, decision: command.decision, feedbackRef: command.feedbackRef };
    if (action === 'submit' ? typeof data.evidenceRef !== 'string' || !/^demo-evidence-[a-z0-9-]{1,30}$/.test(data.evidenceRef) :
        !['changes-requested', 'review-recorded'].includes(data.decision) || typeof data.feedbackRef !== 'string' || !/^demo-feedback-[a-z0-9-]{1,30}$/.test(data.feedbackRef)) throw new Error('Demo references only');
    const record = find(ctx, data.recordId);
    if (action === 'submit' ? record.ownerId !== ctx.actorId : record.ownerId === ctx.actorId) throw new Error('Unavailable');
    await permit(ctx, action, record);
    const key = JSON.stringify([ctx.actorId, ctx.workspaceId, ctx.courseKey, record.id, data.requestId]);
    const fingerprint = JSON.stringify([action, data.expectedRevision, data.evidenceRef, data.decision, data.feedbackRef]);
    const previous = requests.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) return conflict();
      await permit(ctx, action, record);
      return structuredClone(previous.result);
    }
    if (record.revision !== data.expectedRevision) return conflict();
    if (requests.size >= 100) throw new Error('Demo request capacity');
    if (action === 'submit' ? !['working', 'changes-requested'].includes(record.status) : record.status !== 'submitted') throw new Error('Invalid transition');
    const next = { ...record, revision: record.revision + 1,
      status: action === 'submit' ? 'submitted' : data.decision,
      evidenceRef: action === 'submit' ? data.evidenceRef : record.evidenceRef,
      feedbackRef: action === 'submit' ? null : data.feedbackRef };
    await permit(ctx, action, record);
    const result = view(next);
    records.set(record.id, Object.freeze(next));
    requests.set(key, { fingerprint, result: structuredClone(result) });
    return result;
  }
  return Object.freeze({
    create: input => run(async () => {
      const ctx = context(input);
      if (records.size >= 20) throw new Error('Demo record capacity');
      const record = { id: randomUUID(), ownerId: ctx.actorId, workspaceId: ctx.workspaceId,
        courseKey: ctx.courseKey, revision: 0, status: 'working', evidenceRef: null, feedbackRef: null };
      await permit(ctx, 'create', record); await permit(ctx, 'create', record);
      records.set(record.id, Object.freeze(record)); return view(record);
    }),
    read: (input, id) => run(async () => {
      const ctx = context(input), record = find(ctx, id);
      await permit(ctx, 'read', record); await permit(ctx, 'read', record); return view(record);
    }),
    submit: (input, command) => run(() => mutate(input, command, 'submit')),
    review: (input, command) => run(() => mutate(input, command, 'review')),
    dispose() { disposed = true; records.clear(); requests.clear(); }
  });
}
