const dayMs = 86400000;
const nyDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit' });

// Pure calculations only. Inputs support UTC years 1970-9998 and millisecond precision.
function timestamp(value) {
  let result;
  if (value instanceof Date) result = new Date(value.getTime());
  else {
    const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) throw new Error('Explicit-offset ISO timestamp or Date required');
    const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
    if (year < 1970 || year > 9998 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour > 23 || minute > 59 || second > 59) {
      throw new Error('Invalid retention timestamp');
    }
    result = new Date(value);
  }
  if (!Number.isFinite(result.getTime()) || result.getUTCFullYear() < 1970 || result.getUTCFullYear() > 9998) throw new Error('Unsupported retention timestamp');
  return result;
}
function localParts(ms) {
  const parts = Object.fromEntries(nyDate.formatToParts(new Date(ms)).filter(part => ['year', 'month', 'day'].includes(part.type)).map(part => [part.type, Number(part.value)]));
  return [parts.year, parts.month, parts.day];
}
const dateKey = ([year, month, day]) => year * 10000 + month * 100 + day;

export function applicationDeletionEligibleAt(closedAt) {
  const closed = timestamp(closedAt), [year, month, day] = localParts(closed.getTime());
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (let counted = 0; counted < 3;) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (![0, 6].includes(cursor.getUTCDay())) counted++;
  }
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  const target = dateKey([cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate()]);
  let low = cursor.getTime() - 2 * dayMs, high = cursor.getTime() + 2 * dayMs;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dateKey(localParts(middle)) >= target) high = middle; else low = middle;
  }
  return new Date(high);
}

export function auditDeletionEligibleAt(occurredAt) {
  const occurred = timestamp(occurredAt), totalMonth = occurred.getUTCMonth() + 3;
  const year = occurred.getUTCFullYear() + Math.floor(totalMonth / 12), month = totalMonth % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), day = Math.min(occurred.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day, occurred.getUTCHours(), occurred.getUTCMinutes(), occurred.getUTCSeconds(), occurred.getUTCMilliseconds()));
}
