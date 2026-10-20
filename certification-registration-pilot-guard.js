const isId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const sections = new Set(['overview', 'enrollments', 'labs', 'students', 'courses']);
const uuid = '[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}';
const registrationButton = new RegExp(`^cert:register:(?:open|(?:confirm|cancel):${uuid})$`);
const invitedButton = new RegExp(`^cert:invite:(?:start|(?:previous|next|form|cancel):${uuid})$`);
const invitedModal = new RegExp(`^cert:invite:send:${uuid}$`);
const banner = 'Registration pilot: submissions request review only; no student ID, course access or lab access is granted.';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
function snapshot(s) {
  if (s?.enabled !== true || !isId(s.ownerId) || !isId(s.guildId) || !isId(s.adminChannelId) ||
      !Array.isArray(s.studentIds) || s.studentIds.length < 1 || s.studentIds.length > 5 ||
      !s.studentIds.every(id => isId(id) && id !== s.ownerId) || new Set(s.studentIds).size !== s.studentIds.length) {
    throw new Error('Explicit valid pilot settings required');
  }
  return Object.freeze({ enabled: true, ownerId: s.ownerId, guildId: s.guildId,
    adminChannelId: s.adminChannelId, studentIds: Object.freeze([...s.studentIds]) });
}
export function readRegistrationPilotOptions(env = {}) {
  const flag = env.CERTIFICATION_REGISTRATION_PILOT;
  if (flag !== undefined && flag !== 'true' && flag !== 'false') throw new Error('Invalid registration pilot flag');
  if (flag !== 'true') return Object.freeze({ enabled: false });
  const expected = { CERTIFICATION_ENABLED: 'true', CERTIFICATION_READ_ONLY_PREVIEW: 'false',
    CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED: 'false', CERTIFICATION_APPLICATION_CLOSURE_ENABLED: 'false', CERTIFICATION_COURSES_ENABLED: 'false' };
  for (const [name, value] of Object.entries(expected)) {
    if (env[name] !== value) throw new Error(`Registration pilot requires explicit ${name}=${value}`);
  }
  const list = env.CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS;
  if (typeof list !== 'string' || list.length > 104 || !/^[0-9]{17,20}(,[0-9]{17,20}){0,4}$/.test(list)) throw new Error('Explicit pilot learner allowlist required');
  return snapshot({ enabled: true, ownerId: env.ACADEMY_OWNER_ID, guildId: env.GUILD_ID,
    adminChannelId: env.ACADEMY_ADMIN_CHANNEL_ID, studentIds: list.split(',') });
}
function readButton(id) {
  return typeof id === 'string' && (
    /^cert:admin:(overview|enrollments|labs):[0-9]{1,6}$/.test(id) ||
    /^cert:admin:courses:(?:[0-9]{1,6}|course:[0-9]{1,6}:[0-9]{1,6}|module:[0-9]{1,6}:[0-9]{1,6}:[0-9]{1,6})$/.test(id) ||
    /^cert:students:(?:list:[0-9]{1,6}|detail:[0-9]{17,20})$/.test(id) ||
    /^cert:dir:(?:all|awaiting_acknowledgment|pending|approved|denied|suspended|revoked):[0-9]{1,5}:[A-Za-z0-9-]{0,48}$/.test(id) ||
    /^cert:audit:[0-9]{1,5}$/.test(id) || ['cert:dir:search', 'cert:console:settings'].includes(id));
}
const studentButton = id => typeof id === 'string' && (invitedButton.test(id) || /^cert:initial:(?:home|status|help)$/.test(id));
function kind(i) {
  const kinds = [i.isButton?.() === true, i.isModalSubmit?.() === true, i.isStringSelectMenu?.() === true];
  return kinds.filter(Boolean).length !== 1 ? null : kinds[0] ? 'button' : kinds[1] ? 'modal' : 'menu';
}
export function createRegistrationPilotPolicy(settings) {
  const s = snapshot(settings), ids = new Set(s.studentIds);
  const allowsStudent = actor => isId(actor) && ids.has(actor);
  return Object.freeze({
    allowsStudent,
    assertTarget(actor) { if (!allowsStudent(actor)) throw new Error('Pilot registration target not permitted'); },
    owner(actor) { return actor === s.ownerId; },
    allowsButton(actor, id) {
      if (typeof id !== 'string') return false;
      return actor === s.ownerId ? readButton(id) || registrationButton.test(id) : allowsStudent(actor) && studentButton(id);
    },
    allowsModal(actor, id) {
      if (typeof id !== 'string') return false;
      return actor === s.ownerId ? ['cert:register:submit', 'cert:dir:search'].includes(id) : allowsStudent(actor) && invitedModal.test(id);
    },
    classify(i) {
      const actor = i.user?.id, type = kind(i), id = i.customId;
      const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
      if (!type || !isId(actor) || i.guildId !== s.guildId || typeof id !== 'string' ||
          (i.message?.flags?.has?.(64) === true && origin && origin !== actor)) return null;
      if (actor === s.ownerId) {
        if (type === 'modal' && id === 'cert:register:submit') {
          let target;
          try { target = i.fields.getTextInputValue('discord_user_id'); } catch { return null; }
          return typeof target === 'string' && allowsStudent(target.trim()) ? 'registration' : null;
        }
        if (type === 'button' && registrationButton.test(id)) return 'registration';
        if (type === 'modal' && id === 'cert:dir:search') return 'read';
        if (type === 'menu' && id === 'cert:admin:section' && Array.isArray(i.values) && i.values.length === 1 && sections.has(i.values[0])) return 'read';
        return type === 'button' && readButton(id) ? 'read' : null;
      }
      if (!allowsStudent(actor)) return null;
      return (type === 'button' && studentButton(id)) || (type === 'modal' && invitedModal.test(id)) ? 'learner' : null;
    }
  });
}
function presentation(payload, policy, actor) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Structured pilot response required');
  if (payload.content != null && typeof payload.content !== 'string') throw new Error('Pilot content must be text');
  const content = banner + (payload.content ? String.fromCharCode(10) + payload.content : '');
  if (content.length > 2000) throw new Error('Pilot response exceeds message limit');
  const components = (payload.components || []).map((row, r) => {
    const source = json(row);
    if (source?.type !== 1 || !Array.isArray(source.components)) throw new Error('Unsupported pilot component row');
    return { ...source, components: source.components.map((component, c) => {
      const item = json(component);
      if (item?.type === 2) return policy.allowsButton(actor, item.custom_id) ? { ...item } : {
        ...item, disabled: true, ...(typeof item.custom_id === 'string' ? { custom_id: `cert:pilot:disabled:${r}:${c}` } : {})
      };
      if (item?.type === 3 && policy.owner(actor) && item.custom_id === 'cert:admin:section') {
        const options = item.options.filter(option => sections.has(option.value));
        return { ...item, options, disabled: item.disabled === true || options.length === 0 };
      }
      if ([3, 5, 6, 7, 8].includes(item?.type)) return { ...item, disabled: true };
      throw new Error('Unsupported pilot message component');
    }) };
  });
  return { ...payload, content, components, allowedMentions: { parse: [] } };
}
// Trusted scoped callbacks only; this is not SQL isolation or runtime activation.
export function createRegistrationPilotRouter({ settings, readViews, registration, learner } = {}) {
  if ([readViews, registration, learner].some(fn => typeof fn !== 'function')) throw new Error('Explicit scoped pilot handlers required');
  const policy = createRegistrationPilotPolicy(settings), handlers = { read: readViews, registration, learner };
  let disposed = false;
  const route = async i => {
    const destination = disposed ? null : policy.classify(i);
    if (!destination) {
      const payload = { content: 'This action is unavailable in the registration pilot. No operation was admitted.', embeds: [], components: [], flags: 64, allowedMentions: { parse: [] } };
      if (i.deferred || i.replied) await i.followUp(payload); else await i.reply(payload);
      return true;
    }
    const actor = i.user.id;
    const adapter = new Proxy(i, { get(target, key) {
      if (['reply', 'editReply', 'followUp', 'update'].includes(key)) return payload => {
        if (key === 'update' && target.message?.flags?.has?.(64) !== true) throw new Error('Public pilot updates are blocked');
        const next = presentation(payload, policy, actor);
        if (key === 'reply' || key === 'followUp') next.flags = 64;
        return target[key](next);
      };
      if (key === 'deferReply') return () => target.deferReply({ flags: 64 });
      if (key === 'deferUpdate') return () => {
        if (target.message?.flags?.has?.(64) !== true) throw new Error('Public pilot updates are blocked');
        return target.deferUpdate();
      };
      if (key === 'showModal') return payload => {
        const modal = json(payload);
        if (!policy.allowsModal(actor, modal?.custom_id)) throw new Error('Pilot modal unavailable');
        return target.showModal(modal);
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    if (await handlers[destination](adapter, policy) !== true) throw new Error('Admitted pilot route was not handled');
    return true;
  };
  if (typeof readViews.initialize === 'function') route.initialize = () => readViews.initialize();
  route.dispose = () => { if (!disposed) { disposed = true; if (typeof readViews.dispose === 'function') return readViews.dispose(); } };
  return route;
}
