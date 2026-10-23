const id = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
export const COMMUNITY_COURSES = Object.freeze(['linux-fundamentals', 'linux-administration', 'linux-security-engineering']);
const courses = new Set(COMMUNITY_COURSES);
const commands = new Set(['start', 'catalog', 'begin', 'continue', 'progress', 'badges']);
export function readCommunityOptions(env = {}) {
  const flag = env.COMMUNITY_LEARNING_ENABLED;
  if (flag !== undefined && flag !== 'false' && flag !== 'true') throw new Error('Invalid community learning flag');
  if (flag !== 'true') return Object.freeze({ enabled: false });
  if (!id(env.GUILD_ID) || !id(env.VERIFIED_ROLE_ID)) throw new Error('Explicit community server and Verified role required');
  return Object.freeze({ enabled: true, guildId: env.GUILD_ID, verifiedRoleId: env.VERIFIED_ROLE_ID });
}
export function classifyCommunityInteraction(i) {
  if (i.isChatInputCommand?.() && commands.has(i.commandName)) {
    let courseKey = null;
    if (i.commandName === 'begin') {
      try { courseKey = i.options.getString('path', true); } catch { return { handled: true, blocked: true }; }
      if (!courses.has(courseKey)) return { handled: true, blocked: true };
    }
    return { handled: true, kind: i.commandName, courseKey };
  }
  if (!i.isButton?.()) return { handled: false };
  const customId = i.customId || '';
  if (customId.startsWith('academy:')) {
    const match = /^academy:([a-z-]+):(\d{1,6}):(.+)$/.exec(customId);
    if (!match || !courses.has(match[1])) return { handled: true, blocked: true };
    return { handled: true, kind: 'course-button', courseKey: match[1] };
  }
  if (customId.startsWith('linux-')) return /^linux-(?:open-m[12]|m[12]-[a-z0-9-]+)$/.test(customId)
    ? { handled: true, kind: 'course-button', courseKey: 'linux-fundamentals' } : { handled: true, blocked: true };
  if (customId.startsWith('badge-page:')) return /^badge-page:\d{1,6}$/.test(customId)
    ? { handled: true, kind: 'badge-button', courseKey: null } : { handled: true, blocked: true };
  return { handled: false };
}
// Admission result only. No message dispatch, database writes, enrollment changes, or startup activation.
export function createCommunityAdmission(options, { resolveCurrentCourse } = {}) {
  const settings = Object.freeze({ ...options });
  if (typeof settings.enabled !== 'boolean' || (settings.enabled && (!id(settings.guildId) || !id(settings.verifiedRoleId)))) throw new Error('Invalid community admission settings');
  return async i => {
    const route = classifyCommunityInteraction(i);
    if (!route.handled) return Object.freeze({ handled: false });
    const deny = reason => Object.freeze({ handled: true, allowed: false, reason });
    if (!settings.enabled) return deny('disabled');
    if (route.blocked) return deny('course_not_available');
    if (i.guildId !== settings.guildId || i.guild?.id !== settings.guildId || !id(i.user?.id)) return deny('wrong_context');
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    if (origin && origin !== i.user.id) return deny('not_your_panel');
    try {
      const member = await i.guild.members.fetch({ user: i.user.id, force: true });
      if (member?.id !== i.user.id || !member.roles?.cache?.has(settings.verifiedRoleId)) return deny('verification_required');
      let courseKey = route.courseKey;
      if (route.kind === 'continue') {
        if (typeof resolveCurrentCourse !== 'function') return deny('course_not_available');
        courseKey = await resolveCurrentCourse(i.user.id);
        if (!courses.has(courseKey)) return deny('course_not_available');
      }
      return Object.freeze({ handled: true, allowed: true, kind: route.kind, courseKey });
    } catch { return deny('verification_unavailable'); }
  };
}
