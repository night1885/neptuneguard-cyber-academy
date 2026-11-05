import { validateCourseRequestReadiness } from './certification-course-request-readiness.js';
async function createDefaultSupport(pool, config, guildId, options) {
  const [{ createCertificationCourseRequests }, { createCourseRequestReader }, { createCourseRequestInteractions }, { COURSE_SECTION_CATALOG, COURSE_SECTION_KEYS }] = await Promise.all([
    import('./certification-course-requests.js'), import('./certification-course-request-reader.js'),
    import('./certification-course-request-interactions.js'), import('./certification-course-sections.js')
  ]);
  return createCourseRequestInteractions({ service: createCertificationCourseRequests(pool, config, { courseKeys: COURSE_SECTION_KEYS }),
    reader: createCourseRequestReader(pool, config), config, guildId, verifiedRoleId: options.verifiedRoleId,
    catalog: COURSE_SECTION_CATALOG, now: options.now });
}
// Wrap the existing course router, not a separate environment or pilot.
export function withCourseRequests(base, pool, config, guildId, { verifiedRoleId, now = Date.now,
  validate = validateCourseRequestReadiness, createSupport = createDefaultSupport } = {}) {
  if (typeof base !== 'function' || config?.enabled !== true || config.courseRequestsEnabled !== true ||
      typeof validate !== 'function' || typeof createSupport !== 'function') throw new Error('Enabled course request integration required');
  const settings = Object.freeze({ ...config });
  let support = null, initializing = null, disposed = false, failed = false;
  const hold = async i => {
    const payload = { content: 'Course requests are unavailable. Reopen your academy panel later.', embeds: [], components: [], allowedMentions: { parse: [] } };
    if (i.deferred || i.replied) await i.editReply(payload); else await i.reply({ ...payload, flags: 64 });
  };
  const route = async i => {
    if (disposed || failed) { await hold(i); return true; }
    if (i.customId?.startsWith('cert:cr:')) { if (!support) { await hold(i); return true; } return support.handle(i); }
    const owner = i.user?.id === settings.ownerId;
    const adminEntry = owner && i.channelId === settings.adminChannelId && /^cert:(?:admin:|students:detail:)/.test(i.customId || '');
    const studentEntry = (owner || settings.studentAccessEnabled === true) && /^cert:(?:initial:(?:home|status|help)|learner:(?:home|status)|course:catalog:)/.test(i.customId || '');
    if (!support || i.guildId !== guildId || (!adminEntry && !studentEntry)) return base(i);
    const adapter = new Proxy(i, { get(target, key) {
      if (key === 'editReply') return payload => {
        // Only extend a private reply; never edit or publish a public entry message.
        if (disposed || !support || !payload?.embeds?.length || !(target.ephemeral === true || target.message?.flags?.has?.(64) === true)) return target.editReply(payload);
        const components = (payload.components || []).map(row => typeof row?.toJSON === 'function' ? row.toJSON() : row);
        if (components.length >= 5 || components.some(row => row.components?.some(button => button.custom_id?.startsWith('cert:cr:')))) return target.editReply(payload);
        return target.editReply({ ...payload, components: [...components, support.views.entry(adminEntry)] });
      };
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    return base(adapter);
  };
  route.initialize = () => {
    if (disposed || failed) return Promise.reject(new Error('Course request runtime stopped; recreate after reconciliation'));
    if (initializing) return initializing;
    initializing = (async () => {
      const checked = await validate(pool);
      if (disposed || checked?.ready !== true) throw new Error('Course request readiness not confirmed');
      if (typeof base.initialize === 'function') await base.initialize();
      if (disposed) throw new Error('Course request startup stopped');
      const candidate = await createSupport(pool, settings, guildId, { verifiedRoleId, now });
      if (disposed) { candidate?.dispose?.(); throw new Error('Course request startup stopped'); }
      if (typeof candidate?.handle !== 'function' || typeof candidate?.views?.entry !== 'function' || typeof candidate?.dispose !== 'function') { candidate?.dispose?.(); throw new Error('Invalid course request support'); }
      support = candidate;
    })().catch(error => { failed = true; support?.dispose(); support = null; disposeBase(); throw error; });
    return initializing;
  };
  let baseDisposed = false;
  const disposeBase = () => { if (!baseDisposed) { baseDisposed = true; base.dispose?.(); } };
  route.dispose = () => { if (disposed) return; disposed = true; try { support?.dispose(); } finally { support = null; disposeBase(); } };
  return route;
}
