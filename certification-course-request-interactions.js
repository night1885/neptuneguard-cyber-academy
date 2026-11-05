import { randomUUID } from 'node:crypto';
import { createCourseRequestViews } from './certification-course-request-views.js';
const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const uuid = '[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}';
export function createCourseRequestInteractions({ service, reader, config, guildId, verifiedRoleId, catalog, now = Date.now } = {}) {
  if (config?.enabled !== true || !validId(config.ownerId) || !validId(config.adminChannelId) || !validId(guildId) || !validId(verifiedRoleId) || typeof now !== 'function' ||
      typeof service?.requestCourse !== 'function' || typeof service.reviewRequest !== 'function' || ['listMine','listPending','getRequest'].some(name => typeof reader?.[name] !== 'function') ||
      (config.studentAccessEnabled !== undefined && typeof config.studentAccessEnabled !== 'boolean')) throw new Error('Explicit course request interaction dependencies required');
  const settings = Object.freeze({ ownerId: config.ownerId, adminChannelId: config.adminChannelId, studentAccessEnabled: config.studentAccessEnabled === true });
  const views = createCourseRequestViews(catalog), keys = new Set(catalog.map(c => c.key));
  const sessions = new Map(), busy = new Set(); let disposed = false;
  function clock() { const n = now(); if (!Number.isSafeInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER - 300000) throw new Error('Invalid confirmation clock'); return n; }
  function context(i) {
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    return !disposed && i.guildId === guildId && i.guild?.id === guildId && validId(i.user?.id) && validId(i.channelId) && validId(i.message?.id) &&
      i.message?.flags?.has?.(64) === true && origin === i.user.id && validId(i.client?.user?.id) && i.message?.author?.id === i.client.user.id;
  }
  const isOwner = i => i.user.id === settings.ownerId && i.channelId === settings.adminChannelId;
  const respond = (i, payload) => i.editReply(payload);
  const deny = i => i.deferred || i.replied ? i.editReply(views.result('This course request action is unavailable. Reopen your own academy panel.')) : i.reply({ content: 'This course request action is unavailable. Reopen your own academy panel.', flags: 64, embeds: [], components: [], allowedMentions: { parse: [] } });
  function issue(i, record) {
    if (sessions.size >= 1000) throw new Error('Confirmation capacity reached');
    const token = randomUUID(); sessions.set(token, Object.freeze({ ...record, actor: i.user.id, guild: i.guildId, channel: i.channelId, message: i.message.id, expires: clock() + 300000 }));
    return token;
  }
  async function handle(i) {
    const id = i.customId || ''; if (!id.startsWith('cert:cr:')) return false;
    if (!i.isButton?.() || !context(i)) { await deny(i); return true; }
    const actor = i.user.id;
    if (busy.has(actor) || busy.size >= 1000) { await deny(i); return true; }
    busy.add(actor); let issued;
    try {
      const stamp = clock(); for (const [token, record] of sessions) if (record.expires <= stamp) sessions.delete(token);
      const adminAction = /^cert:cr:(?:queue:|approve:|deny:)/.test(id);
      if (adminAction && !isOwner(i)) { await deny(i); return true; }
      if (actor !== settings.ownerId && !settings.studentAccessEnabled) { await deny(i); return true; }
      await i.deferUpdate();
      if (actor !== settings.ownerId) {
        const member = await i.guild.members.fetch(actor);
        if (!context(i) || member?.id !== actor || member.roles?.cache?.has(verifiedRoleId) !== true) { await deny(i); return true; }
      }
      if (!context(i)) { await deny(i); return true; }
      const page = /^cert:cr:(catalog|mine|queue):([0-9]{1,4})$/.exec(id);
      const choose = /^cert:cr:choose:([a-z0-9][a-z0-9-]{0,39})$/.exec(id);
      const review = new RegExp(`^cert:cr:(approve|deny):(${uuid})$`).exec(id);
      const confirm = new RegExp(`^cert:cr:(confirm|cancel):(${uuid})$`).exec(id);
      if (page) {
        const n = Number(page[2]);
        if (page[1] === 'catalog') await respond(i, views.catalog(n));
        else {
          const records = page[1] === 'queue' ? await reader.listPending(actor, n) : await reader.listMine(actor, n);
          if (!context(i)) return true;
          if (page[1] === 'mine' && records.some(r => r.discord_user_id !== actor)) throw new Error('Foreign learner data rejected');
          await respond(i, views.requests(records, n, page[1] === 'queue'));
        }
      } else if (choose && keys.has(choose[1])) {
        issued = issue(i, { action: 'request', courseKey: choose[1], subject: actor });
        await respond(i, views.confirmation('request', choose[1], issued, actor)); issued = undefined;
      } else if (review) {
        const record = await reader.getRequest(actor, review[2]);
        if (!context(i) || !isOwner(i)) return true;
        if (!record || record.status !== 'pending' || !keys.has(record.course_key) || !validId(record.discord_user_id)) throw new Error('Pending request unavailable');
        const action = review[1] === 'approve' ? 'approved' : 'denied';
        issued = issue(i, { action, courseKey: record.course_key, subject: record.discord_user_id, requestId: review[2] });
        await respond(i, views.confirmation(action, record.course_key, issued, record.discord_user_id)); issued = undefined;
      } else if (confirm) {
        const record = sessions.get(confirm[2]);
        if (!record || record.actor !== actor || record.guild !== i.guildId || record.channel !== i.channelId || record.message !== i.message.id || clock() >= record.expires ||
            (record.action !== 'request' && !isOwner(i))) throw new Error('Confirmation expired or not owned');
        sessions.delete(confirm[2]);
        if (confirm[1] === 'cancel') { await respond(i, views.result('Canceled. This confirmation made no change.', record.action !== 'request')); return true; }
        if (!context(i)) return true;
        const result = record.action === 'request' ? await service.requestCourse(actor, record.courseKey) : await service.reviewRequest(actor, record.subject, record.requestId, record.action);
        if (!context(i)) return true;
        await respond(i, views.result(record.action === 'request' ? (result.alreadyPending ? 'A pending request already exists. No access was granted.' : 'Course request saved for admin review. No access was granted.') : (result.alreadyReviewed ? 'This decision was already recorded. No new assignment was made.' : `Course request ${record.action}. The decision was recorded.`), record.action !== 'request'));
      } else await deny(i);
      return true;
    } catch {
      if (issued) sessions.delete(issued);
      if (!disposed) { const payload = views.result('The outcome could not be confirmed. Check the current request status before retrying.'); if (i.deferred || i.replied) await respond(i, payload); else await i.reply({ ...payload, flags: 64 }); }
      return true;
    } finally { busy.delete(actor); }
  }
  return Object.freeze({ handle, views, dispose() { disposed = true; sessions.clear(); } });
}
