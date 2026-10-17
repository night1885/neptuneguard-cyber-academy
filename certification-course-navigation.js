import { randomUUID } from 'node:crypto';
import { ModalBuilder } from 'discord.js';
import { COURSE_SECTION_KEYS, createCourseSectionAuthorization, createCourseSectionLoginHandler } from './certification-course-sections.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';

const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const cursorPattern = /^(overview|module|lesson|lab|hint|quiz|answer):[0-9]{1,4}:[0-9]{1,4}(?::[a-z0-9-]{1,16})?$/;
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;

export function createProtectedCourseNavigation(pool, config, guildId, { verifiedRoleId, renderPage, now = Date.now, ttlMs = 300000, maxSessions = 1000 } = {}) {
  if (config?.enabled !== true || !validId(guildId) || !validId(verifiedRoleId) || typeof renderPage !== 'function' || typeof now !== 'function' ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 1000 || ttlMs > 300000 || !Number.isSafeInteger(maxSessions) || maxSessions < 1 || maxSessions > 1000) throw new Error('Explicit course navigation context, renderer and bounded sessions required');
  const allowed = new Set(COURSE_SECTION_KEYS), grants = new Map();
  const authorize = createCourseSectionAuthorization(pool, config);
  const roleReads = createStatusReadGuard({ now, limit: 30 }), pageReads = createStatusReadGuard({ now, limit: 30 });
  let disposed = false, login;
  const time = () => { const value = now(); if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - ttlMs) throw new Error('Invalid navigation clock'); return value; };
  const context = i => {
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    return !disposed && config.enabled === true && i.guildId === guildId && i.guild?.id === guildId && validId(i.user?.id) &&
      !(i.message?.flags?.has?.(64) === true && origin && origin !== i.user.id);
  };
  const respond = (i, payload) => {
    const message = { content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } };
    return i.deferred || i.replied ? i.editReply(message) : i.reply({ ...message, flags: 64 });
  };
  const deny = i => respond(i, { content: 'Course navigation is unavailable, expired, or no longer authorized. Re-enter the course and check your current assignment.' });
  const purge = () => { const stamp = time(); for (const [token, grant] of grants) if (grant.expiresAt <= stamp) grants.delete(token); };
  const live = (i, token, grant) => context(i) && grants.get(token) === grant && grant && grant.actor === i.user.id && grant.guildId === i.guildId && time() < grant.expiresAt;
  const matches = (authorization, grant) => authorization?.student_id === grant.studentId && authorization?.course_key === grant.courseKey;
  function safePayload(payload, token) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Course page payload required');
    const rows = (payload.components || []).map(json);
    if (!Array.isArray(rows) || rows.length > 5 || (payload.content !== undefined && (typeof payload.content !== 'string' || payload.content.length > 2000)) ||
        (payload.embeds !== undefined && (!Array.isArray(payload.embeds) || payload.embeds.length > 10))) throw new Error('Invalid course page bounds');
    const prefix = `cert:course:page:${token}:`;
    for (const row of rows) {
      if (row.type !== 1 || !Array.isArray(row.components) || !row.components.length || row.components.length > 5) throw new Error('Invalid course controls');
      for (const raw of row.components) {
        const item = json(raw);
        if (item.type !== 2 || item.url || typeof item.custom_id !== 'string' || item.custom_id.length > 100 || !item.custom_id.startsWith(prefix) ||
            !cursorPattern.test(item.custom_id.slice(prefix.length))) throw new Error('Course control must stay within its bound session');
      }
    }
    return { content: payload.content || '', embeds: payload.embeds || [], components: rows };
  }
  async function deliver(i, token, cursor, alreadyDeferred = false) {
    const grant = grants.get(token);
    if (!live(i, token, grant)) return deny(i);
    if (!alreadyDeferred) await i.deferReply({ flags: 64 });
    try {
      await pageReads.run(i.user.id, async () => {
        if (!matches(await authorize(grant.actor, grant.courseKey), grant) || !live(i, token, grant)) { grants.delete(token); await deny(i); return; }
        const buttonId = next => { if (typeof next !== 'string' || !cursorPattern.test(next)) throw new Error('Invalid course cursor');
          const id = `cert:course:page:${token}:${next}`; if (id.length > 100) throw new Error('Course control too long'); return id; };
        const payload = safePayload(await renderPage({ courseKey: grant.courseKey, cursor, buttonId }), token);
        if (!live(i, token, grant) || !matches(await authorize(grant.actor, grant.courseKey), grant) || !live(i, token, grant)) { grants.delete(token); await deny(i); return; }
        await respond(i, payload);
      });
    } catch { grants.delete(token); await deny(i); }
  }
  login = createCourseSectionLoginHandler(pool, config, guildId, { now, ttlMs, async onVerified(i, courseKey) {
    if (!context(i)) throw new Error('Course context changed');
    purge();
    for (const [token, grant] of grants) if (grant.actor === i.user.id && grant.courseKey === courseKey) grants.delete(token);
    if (grants.size >= maxSessions) throw new Error('Course session capacity reached');
    const studentId = i.fields.getTextInputValue('student_id').trim();
    const token = randomUUID(); grants.set(token, { actor: i.user.id, guildId, courseKey, studentId, expiresAt: time() + ttlMs });
    await deliver(i, token, 'overview:0:0', true);
  } });
  async function handle(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('cert:course:')) return false;
    if (!context(interaction)) { await deny(interaction); return true; }
    try {
      purge();
      const open = /^cert:course:open:([a-z0-9][a-z0-9-]{0,39})$/.exec(id);
      const submit = new RegExp(`^cert:course:submit:(${uuid})$`).exec(id);
      const page = new RegExp(`^cert:course:page:(${uuid}):(.+)$`).exec(id);
      if ((open && (!interaction.isButton?.() || !allowed.has(open[1]))) || (submit && !interaction.isModalSubmit?.()) ||
          (page && (!interaction.isButton?.() || !cursorPattern.test(page[2]) || !live(interaction, page[1], grants.get(page[1])))) || (!open && !submit && !page)) { await deny(interaction); return true; }
      const member = await roleReads.run(interaction.user.id, () => interaction.guild.members.fetch(interaction.user.id));
      if (!context(interaction) || member?.id !== interaction.user.id || !member.roles?.cache?.has(verifiedRoleId)) {
        if (page) grants.delete(page[1]); await deny(interaction); return true;
      }
      if (page) { await deliver(interaction, page[1], page[2]); return true; }
      const adaptedId = open ? `cert:section:open:${open[1]}` : `cert:section:submit:${submit[1]}`;
      const adapter = new Proxy(interaction, { get(target, key) {
        if (key === 'customId') return adaptedId;
        if (key === 'showModal') return modal => {
          const data = modal.toJSON();
          if (!new RegExp(`^cert:section:submit:${uuid}$`).test(data.custom_id)) throw new Error('Invalid course modal');
          return target.showModal(ModalBuilder.from(data).setCustomId(data.custom_id.replace('cert:section:submit:', 'cert:course:submit:')));
        };
        const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
      } });
      await login(adapter); return true;
    } catch { await deny(interaction); return true; }
  }
  return Object.freeze({ handle, dispose() { disposed = true; grants.clear(); login = null; } });
}
