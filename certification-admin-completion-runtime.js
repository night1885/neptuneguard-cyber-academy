import { attachCertificationRuntime } from './certification-runtime.js';
import { createCourseRuntimeRouter } from './certification-course-runtime.js';
import { createReadyManagedCourseNavigation } from './certification-course-admin.js';
import { COURSE_SECTION_KEYS } from './certification-course-sections.js';
import { createCurrentAdministratorVerifier } from './certification-current-admin.js';
import { createAdministratorCourseCompletion } from './certification-admin-completion.js';
import { createAdministratorCompletionControls } from './certification-admin-completion-ui.js';
const prefix = 'cert:admincomplete:';
const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
function adapt(i, overrides) { return new Proxy(i, { get(target, key) { if (Object.hasOwn(overrides, key)) return overrides[key]; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } }); }

export function createAdministratorCompletionCourseRouter(client, pool, config, guildId, options = {}, { createRouter = createCourseRuntimeRouter, createNavigation = createReadyManagedCourseNavigation, createVerifier = createCurrentAdministratorVerifier, createCompletion = createAdministratorCourseCompletion } = {}) {
  const verify = createVerifier(client, guildId);
  let controls, disposed = false, ready = false;
  const context = i => { const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id; return !disposed && i.guildId === guildId && validId(i.user?.id) && !(i.message?.flags?.has?.(64) === true && origin && origin !== i.user.id); };
  const respond = (i, content) => { const payload = { content, embeds: [], components: [], allowedMentions: { parse: [] } }; return i.deferred || i.replied ? i.editReply(payload) : i.reply({ ...payload, flags: 64 }); };
  const base = createRouter(pool, config, guildId, { ...options, async createNavigation(p, c, g, navigationOptions) {
    const navigation = await createNavigation(p, c, g, navigationOptions);
    try {
      if (disposed) throw new Error('Completion startup stopped');
      const service = createCompletion(p, c, { courseKeys: COURSE_SECTION_KEYS, verifyAdministrator: async actor => !disposed && await verify(actor) === true && !disposed });
      controls = createAdministratorCompletionControls({ guildId: g, courseKeys: COURSE_SECTION_KEYS, verifyAdministrator: verify, service, now: options.now });
      return Object.freeze({ ...navigation, async handleAdmin(i) {
        const legacy = /^cert:courselife:complete:([0-9]{17,20}):([a-z0-9][a-z0-9-]{0,39})$/.exec(i.customId || '');
        if (legacy) return controls.handle(adapt(i, { customId: `${prefix}request:${legacy[1]}:${legacy[2]}` }));
        if (i.customId?.startsWith(prefix)) return controls.handle(i);
        return typeof navigation.handleAdmin === 'function' ? navigation.handleAdmin(i) : false;
      }, dispose() { controls.dispose(); navigation.dispose(); } });
    } catch (error) { navigation.dispose(); throw error; }
  } });
  async function route(i) {
    if (!ready || disposed) return base(i);
    const customId = i.customId || '';
    if (customId === `${prefix}open` || customId === `${prefix}form`) {
      try {
        if (!context(i)) throw new Error('Invalid completion context');
        if (customId.endsWith(':open') && i.isButton?.() === true) {
          if (await verify(i.user.id) !== true || !context(i)) throw new Error('Current Administrator required');
          await i.showModal({ custom_id: `${prefix}form`, title: 'Review course completion', components: [
            { type: 1, components: [{ type: 4, custom_id: 'student', label: 'Learner Discord user ID', style: 1, required: true, min_length: 17, max_length: 20 }] },
            { type: 1, components: [{ type: 4, custom_id: 'course', label: 'Exact course key', style: 1, required: true, min_length: 1, max_length: 40 }] }
          ] }); return true;
        }
        if (!customId.endsWith(':form') || i.isModalSubmit?.() !== true) throw new Error('Invalid completion form');
        const subject = i.fields.getTextInputValue('student').trim(), course = i.fields.getTextInputValue('course').trim();
        if (!validId(subject) || !COURSE_SECTION_KEYS.includes(course)) throw new Error('Invalid learner or course');
        return controls.handle(adapt(i, { customId: `${prefix}request:${subject}:${course}`, isButton: () => true, isModalSubmit: () => false }));
      } catch { await respond(i, 'Completion review is unavailable. Verify your current Administrator permission and the exact learner/course, then retry.'); return true; }
    }
    if (context(i) && i.isButton?.() === true && /^cert:initial:(home|status|help)$/.test(customId)) {
      return base(adapt(i, { editReply: payload => {
        const components = payload.components || [];
        if (disposed || !payload.embeds?.length || components.length >= 5 || (Number(payload.flags || 0) & 32768)) return i.editReply(payload);
        return i.editReply({ ...payload, components: [...components, { type: 1, components: [{ type: 2, style: 2, custom_id: `${prefix}open`, label: 'Admin: review course completion' }] }] });
      } }));
    }
    return base(i);
  }
  route.initialize = async () => { if (disposed) throw new Error('Completion runtime disposed'); await base.initialize(); if (disposed) throw new Error('Completion startup stopped'); ready = true; };
  route.dispose = () => { disposed = true; ready = false; controls?.dispose(); return base.dispose(); };
  return route;
}

export function attachAdministratorCertificationRuntime(client, pool, guildId, env, options = {}) {
  return attachCertificationRuntime(client, pool, guildId, env, { ...options, createCourseRouter: (p, c, g, courseOptions) => createAdministratorCompletionCourseRouter(client, p, c, g, courseOptions) });
}
