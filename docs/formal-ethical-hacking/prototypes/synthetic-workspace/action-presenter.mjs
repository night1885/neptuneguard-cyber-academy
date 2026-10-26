// Offline synthetic refresh only. No actual message delivery or runtime wiring.
const demo = value => typeof value === 'string' && /^demo-[a-z0-9-]{1,40}$/.test(value);
const unavailable = () => ({ ok: false, reason: 'unavailable' });
const refreshFailed = () => ({ ok: false, reason: 'refresh-unavailable', mutationOutcome: 'committed-or-replayed' });
export function createSyntheticActionPresenter({ controls, store } = {}) {
  if (typeof controls?.press !== 'function' || typeof store?.read !== 'function') throw new Error('Explicit demo controls and store required');
  return Object.freeze({
    async press(input) {
      let receipt;
      try {
        const keys = ['actorId', 'workspaceId', 'courseKey', 'messageId', 'privateWorkspace', 'customId'];
        if (!input || Object.keys(input).some(key => !keys.includes(key)) ||
            ![input.actorId, input.workspaceId, input.messageId].every(demo) ||
            input.courseKey !== 'demo-ethical-hacking' || input.privateWorkspace !== true || typeof input.customId !== 'string') return unavailable();
        const { actorId, workspaceId, courseKey, messageId, customId } = input;
        const captured = Object.freeze({ actorId, workspaceId, courseKey, messageId, privateWorkspace: true, customId });
        receipt = await controls.press(captured);
        if (!receipt?.ok) return receipt?.reason === 'conflict' ? { ok: false, reason: 'conflict' } : unavailable();
        if (receipt.messageId !== messageId || receipt.operation !== 'edit-existing-private-message' || !receipt.record?.id) return refreshFailed();
        const ctx = { actorId, workspaceId, courseKey, privateWorkspace: true };
        const current = await store.read(ctx, receipt.record.id);
        if (!current?.ok || current.record.id !== receipt.record.id || current.record.workspaceId !== workspaceId || current.record.courseKey !== courseKey) return refreshFailed();
        return { ok: true, messageId, operation: 'edit-existing-private-message', visibility: 'private-required',
          record: structuredClone(current.record), receipt: { revision: receipt.record.revision, status: receipt.record.status },
          allowedMentions: { parse: [] }, persisted: false, evidenceCollected: false, grantsAccess: false, awardsIssued: false };
      } catch { return receipt?.ok ? refreshFailed() : unavailable(); }
    }
  });
}
