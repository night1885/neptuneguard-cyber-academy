import { COURSE_SECTION_CATALOG } from './certification-course-sections.js';
import { createReadyCourseNavigation } from './certification-course-readiness.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';
import { replyRetentionHold } from './certification-retention-hold.js';

const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
export function readCourseRuntimeOptions(env = {}) {
  const flag = env.CERTIFICATION_COURSES_ENABLED;
  if (flag !== undefined && flag !== 'true' && flag !== 'false') throw new Error('Invalid course runtime flag');
  if (flag !== 'true') return Object.freeze({ enabled: false });
  if (!validId(env.VERIFIED_ROLE_ID)) throw new Error('Explicit Verified role required for course runtime');
  return Object.freeze({ enabled: true, verifiedRoleId: env.VERIFIED_ROLE_ID });
}
export function createCourseRuntimeRouter(pool, config, guildId, { verifiedRoleId, now = Date.now,
  createBaseRouter = createCertificationRouter, createNavigation = createReadyCourseNavigation } = {}) {
  if (config?.enabled !== true || !validId(config.ownerId) || !validId(guildId) || !validId(verifiedRoleId) ||
      [now, createBaseRouter, createNavigation].some(value => typeof value !== 'function')) throw new Error('Explicit enabled course runtime context required');
  const base = createBaseRouter(pool, config, guildId);
  if (typeof base !== 'function') throw new Error('Base course runtime router required');
  const reads = createStatusReadGuard({ now, limit: 30 });
  let navigation = null, initializing = null, disposed = false;
  const context = i => {
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    return !disposed && config.enabled === true && i.guildId === guildId && i.guild?.id === guildId && validId(i.user?.id) &&
      !(i.message?.flags?.has?.(64) === true && origin && origin !== i.user.id);
  };
  const respond = (i, payload) => {
    const message = { content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } };
    return i.deferred || i.replied ? i.editReply(message) : i.reply({ ...message, flags: 64 });
  };
  const button = (id, label) => ({ type: 2, style: 2, custom_id: id, label: label.slice(0, 80) });
  const row = buttons => ({ type: 1, components: buttons });
  const route = async interaction => {
    if (disposed || !navigation) { await replyRetentionHold(interaction); return true; }
    const id = interaction.customId || '', catalog = /^cert:course:catalog:([0-9]{1,4})$/.exec(id);
    if (id.startsWith('cert:course:catalog:')) {
      if (!catalog || !context(interaction) || !interaction.isButton?.()) { await respond(interaction, { content: 'Open your own course catalog in the configured server.' }); return true; }
      await interaction.deferReply({ flags: 64 });
      try {
        const member = await reads.run(interaction.user.id, () => interaction.guild.members.fetch(interaction.user.id));
        if (!context(interaction) || member?.id !== interaction.user.id || !member.roles?.cache?.has(verifiedRoleId)) throw new Error('Course catalog verification required');
        const page = Number(catalog[1]), count = Math.max(1, Math.ceil(COURSE_SECTION_CATALOG.length / 5));
        if (page >= count) throw new Error('Invalid course catalog page');
        const courses = COURSE_SECTION_CATALOG.slice(page * 5, page * 5 + 5), components = [];
        if (courses.length) components.push(row(courses.map(course => button(`cert:course:open:${course.key}`, course.title))));
        const navigationButtons = [];
        if (page > 0) navigationButtons.push(button(`cert:course:catalog:${page - 1}`, 'Previous courses'));
        navigationButtons.push(button(`cert:course:catalog:${page}`, 'Refresh catalog'));
        if (page + 1 < count) navigationButtons.push(button(`cert:course:catalog:${page + 1}`, 'Next courses'));
        components.push(row(navigationButtons));
        await respond(interaction, { embeds: [{ title: 'Academy course catalog', color: 0x3498db,
          description: `Page ${page + 1}/${count}. Catalog listing does not grant access. Entry requires your permanent ID and a separate active assignment for the selected course. No saved progress or automatic completion. ${courses.map(course => course.title).join(' • ')}`.slice(0, 3500) }], components });
      } catch { await respond(interaction, { content: 'Course catalog could not be verified. Retry later or check server verification.' }); }
      return true;
    }
    if (id.startsWith('cert:course:')) return navigation.handle(interaction);
    if (!context(interaction) || !interaction.isButton?.() || !/^cert:(?:initial:(?:home|status|help)|learner:(?:home|status))$/.test(id)) return base(interaction);
    const adapter = new Proxy(interaction, { get(target, key) {
      if (key === 'editReply') return payload => {
        const components = payload.components || [];
        return target.editReply(payload.embeds?.length && components.length < 5 ? { ...payload,
          content: (payload.content ? payload.content + ' ' : '') + 'Enrollment checks do not grant every course. Each selected course requires a separate active assignment.',
          components: [...components, row([button('cert:course:catalog:0', 'Course catalog / enter course')])] } : payload);
      };
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    return base(adapter);
  };
  route.initialize = function initialize() {
    if (disposed) return Promise.reject(new Error('Course runtime disposed'));
    if (navigation) return Promise.resolve();
    if (initializing) return initializing;
    initializing = (async () => {
      if (typeof base.initialize === 'function') await base.initialize();
      if (disposed) throw new Error('Course startup stopped');
      const candidate = await createNavigation(pool, config, guildId, { verifiedRoleId, now });
      if (disposed) { candidate?.dispose?.(); throw new Error('Course startup stopped'); }
      if (typeof candidate?.handle !== 'function' || typeof candidate.dispose !== 'function') throw new Error('Ready protected course navigation required');
      navigation = candidate;
    })().catch(error => { initializing = null; throw error; });
    return initializing;
  };
  route.dispose = () => {
    disposed = true;
    try { navigation?.dispose(); }
    finally { navigation = null; if (typeof base.dispose === 'function') base.dispose(); }
  };
  return route;
}
