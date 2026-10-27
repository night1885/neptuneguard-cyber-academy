// Synthetic metadata inspection only. Never import into academy runtime.
const DAY = 86_400_000;
const MAX_TIME = 8_640_000_000_000_000;
const demo = value => typeof value === 'string' && /^demo-[a-z0-9-]{1,40}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME;
const fields = ['learnerId', 'recordId', 'submissionId', 'courseKey', 'scope', 'status', 'submittedAtMs'];
function snapshot(input) {
  if (!input || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new Error('Invalid fixture');
  const descriptors = Object.getOwnPropertyDescriptors(input), keys = Reflect.ownKeys(descriptors);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) throw new Error('Invalid fixture');
  const copy = Object.create(null);
  for (const key of fields) {
    if (!Object.hasOwn(descriptors[key], 'value')) throw new Error('Invalid fixture');
    copy[key] = descriptors[key].value;
  }
  return Object.freeze(copy);
}
const result = (outcome, details = {}) => Object.freeze({ outcome, ...details,
  authorizationGranted: false, deletionAuthorized: false, liveIntakeEnabled: false });
export function createSyntheticReportRetentionInspector({ readNow } = {}) {
  if (typeof readNow !== 'function') throw new Error('Explicit trusted fixture clock required');
  let lastNow = -1;
  return Object.freeze({ inspect(input) {
    try {
      const row = snapshot(input);
      if (!demo(row.learnerId) || !demo(row.recordId) || row.courseKey !== 'demo-ethical-hacking' ||
          !['report-only', 'shared'].includes(row.scope) || !['draft', 'submitted'].includes(row.status)) throw new Error('Invalid fixture');
      if (row.status === 'draft') {
        if (row.submissionId !== null || row.submittedAtMs !== null) throw new Error('Invalid fixture');
        return result('policy-unresolved', { reason: 'unsubmitted-draft', windowOpen: false });
      }
      if (!demo(row.submissionId) || !time(row.submittedAtMs) || row.submittedAtMs > MAX_TIME - DAY) throw new Error('Invalid fixture');
      if (row.scope === 'shared') return result('policy-unresolved', { reason: 'shared-record', windowOpen: false });
      const now = readNow();
      if (!time(now) || now < row.submittedAtMs || now < lastNow) throw new Error('Invalid fixture clock');
      lastNow = now;
      const expiresAtMs = row.submittedAtMs + DAY;
      return result(now < expiresAtMs ? 'within-window' : 'expired', {
        windowOpen: now < expiresAtMs, expiresAtMs,
        learnerId: row.learnerId, recordId: row.recordId, submissionId: row.submissionId });
    } catch { return result('unavailable', { windowOpen: false }); }
  } });
}
