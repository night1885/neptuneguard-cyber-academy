export function formalLessonTitle({id,heading} = {}) {
  if (typeof id !== 'string' || !/^EH-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id) || id.length > 64) throw new TypeError('Invalid formal lesson identity');
  let text = typeof heading === 'string' ? heading.trim() : '';
  const prefixes = [`${id} — `, `${id} – `, `${id} - `, `${id}: `];
  for (;;) {
    const prefix = prefixes.find(value => text.startsWith(value));
    if (!prefix) break;
    text = text.slice(prefix.length).trim();
  }
  const value = !text || text === id ? id : `${id} — ${text}`;
  return value.slice(0,256).replace(/[\uD800-\uDBFF]$/,'');
}
