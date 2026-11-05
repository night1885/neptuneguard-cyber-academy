const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const validUuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const button = (suffix, label, style = 2) => ({ type: 2, style, custom_id: `cert:cr:${suffix}`, label: label.slice(0, 80) });
const row = components => ({ type: 1, components });
const payload = (title, description, components) => ({ content: '', embeds: [{ title, description, color: 0x3498db }], components, allowedMentions: { parse: [] } });
const escapeText = value => String(value).replace(/[\\`*_~|<>\[\]()]/g, '');
export function createCourseRequestViews(catalog) {
  if (!Array.isArray(catalog) || !catalog.length || catalog.length > 50 || catalog.some(c => !/^[a-z0-9][a-z0-9-]{0,39}$/.test(c?.key || '') || typeof c.title !== 'string' || !c.title.trim() || c.title.length > 100) || new Set(catalog.map(c => c.key)).size !== catalog.length) throw new Error('Explicit valid course catalog required');
  const courses = catalog.map(c => Object.freeze({ key: c.key, title: c.title }));
  const titles = new Map(courses.map(c => [c.key, c.title]));
  const courseTitle = key => { if (!titles.has(key)) throw new Error('Unknown course'); return escapeText(titles.get(key)); };
  function pageNumber(page) { if (!Number.isInteger(page) || page < 0 || page > 9999) throw new Error('Invalid page'); }
  function navigation(kind, page, more) {
    const buttons = [];
    if (page > 0) buttons.push(button(`${kind}:${page - 1}`, 'Previous'));
    buttons.push(button(`${kind}:${page}`, 'Refresh'));
    if (more && page < 9999) buttons.push(button(`${kind}:${page + 1}`, 'Next'));
    buttons.push(button(kind === 'queue' ? 'queue:0' : 'catalog:0', kind === 'queue' ? 'First page' : 'Course catalog'));
    if (kind !== 'queue') buttons.push(button('mine:0', 'My requests'));
    return row(buttons);
  }
  function validateRecords(records) {
    if (!Array.isArray(records) || records.length > 6 || records.some(r => !validUuid(r.request_id) || !validId(r.discord_user_id) || !titles.has(r.course_key) || !['pending','approved','denied'].includes(r.status))) throw new Error('Invalid request records');
  }
  return Object.freeze({
    entry(owner = false) { return row([button(owner ? 'queue:0' : 'catalog:0', owner ? 'Course requests' : 'Request a course')]); },
    catalog(page) {
      pageNumber(page); const pages = Math.ceil(courses.length / 5);
      if (page >= pages) throw new Error('Invalid catalog page');
      const visible = courses.slice(page * 5, page * 5 + 5);
      return payload('Request a course', `Page ${page + 1}/${pages}. Choose one course per request. Each course needs admin approval before access. An active course does not prevent another request.`, [row(visible.map(c => button(`choose:${c.key}`, c.title))), navigation('catalog', page, page + 1 < pages)]);
    },
    requests(records, page, owner = false) {
      pageNumber(page); validateRecords(records); const visible = records.slice(0, owner ? 4 : 5);
      if (owner && visible.some(r => r.status !== 'pending')) throw new Error('Pending queue records required');
      const description = visible.map((r, index) => `${index + 1}. ${courseTitle(r.course_key)} — ${r.status}${owner ? ` — learner ${r.discord_user_id}` : ''}`).join('\n') || 'No requests on this page.';
      const components = owner ? visible.map((r, index) => row([button(`approve:${r.request_id}`, `Approve ${index + 1}`, 3), button(`deny:${r.request_id}`, `Deny ${index + 1}`, 4)])) : [];
      // Four requests plus navigation keep the owner queue within Discord's five-row limit.
      components.push(navigation(owner ? 'queue' : 'mine', page, records.length > (owner ? 4 : 5)));
      return payload(owner ? 'Pending course requests' : 'My course requests', description, components);
    },
    confirmation(action, courseKey, token, subject) {
      if (!['request','approved','denied'].includes(action) || !validUuid(token) || !validId(subject)) throw new Error('Invalid confirmation');
      return payload('Confirm course request action', `${action === 'request' ? 'Request' : action === 'approved' ? 'Approve' : 'Deny'} ${courseTitle(courseKey)} for Discord user ${subject}? ${action === 'request' ? 'This requests review only and grants no course access.' : 'The backend rechecks the current records before saving.'} Confirmations expire after five minutes.`, [row([button(`confirm:${token}`, 'Confirm', action === 'denied' ? 4 : 3), button(`cancel:${token}`, 'Cancel')])]);
    },
    result(message, owner = false) { if (typeof message !== 'string' || message.length > 1800) throw new Error('Invalid result'); return payload('Course request status', message, [row([button(owner ? 'queue:0' : 'mine:0', owner ? 'Pending requests' : 'My requests'), button('catalog:0', 'Course catalog')])]); }
  });
}
