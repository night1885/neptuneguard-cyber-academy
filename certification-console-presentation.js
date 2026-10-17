const COLORS = Object.freeze({ blue: 0x3498db, purple: 0x9b59b6, teal: 0x1abc9c, amber: 0xf1c40f, green: 0x2ecc71, red: 0xe74c3c, gray: 0x95a5a6 });
const statusNames = 'all|awaiting_acknowledgment|pending|approved|denied|suspended|revoked|expired';
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';
const routes = [
  /^cert:admin:(overview|enrollments|labs):\d{1,6}$/,
  /^cert:admin:courses:\d{1,5}$/,
  /^cert:admin:courses:course:\d{1,5}:\d{1,5}$/,
  /^cert:admin:courses:module:\d{1,5}:\d{1,5}:\d{1,5}$/,
  /^cert:students:(list:\d{1,6}|detail:\d{17,20})$/,
  /^cert:student-audit:\d{17,20}:\d{1,5}$/,
  /^cert:console:settings$/,
  /^cert:audit:\d{1,5}$/,
  new RegExp(`^cert:dir:(${statusNames}):\\d{1,5}:[A-Za-z0-9-]{0,48}$`),
  new RegExp(`^cert:labview:(${statusNames}):\\d{1,5}$`),
  new RegExp(`^cert:labview:student:\\d{17,20}:(${statusNames}):\\d{1,5}$`),
  new RegExp(`^cert:labview:(detail|review):(${uuid})$`)
];
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;
const restore = (original, data) => typeof original?.toJSON === 'function' && typeof original.constructor?.from === 'function'
  ? original.constructor.from(data) : data;

export function consoleViewId(interaction) {
  const id = interaction.customId || '';
  if (interaction.isStringSelectMenu?.() && id === 'cert:admin:section') {
    const section = interaction.values?.length === 1 ? interaction.values[0] : null;
    if (section === 'students') return 'cert:students:list:0';
    if (section === 'courses') return 'cert:admin:courses:0';
    return ['overview', 'enrollments', 'labs'].includes(section) ? `cert:admin:${section}:0` : null;
  }
  if (interaction.isModalSubmit?.()) return id === 'cert:dir:search' ? id : null;
  if (!interaction.isButton?.()) return null;
  if (id === 'cert:dir:search') return id;
  return routes.some(pattern => pattern.test(id)) ? id : null;
}

function viewColor(id) {
  if (id.startsWith('cert:labview:review:')) return COLORS.amber;
  if (id.startsWith('cert:audit:') || id.startsWith('cert:student-audit:')) return COLORS.purple;
  const status = /^cert:labview:(?:student:\d{17,20}:)?(all|pending|approved|denied|suspended|revoked|expired):/.exec(id)?.[1]
    || /^cert:dir:(all|awaiting_acknowledgment|pending|approved|denied|suspended|revoked):/.exec(id)?.[1];
  if (status === 'approved') return COLORS.green;
  if (status === 'pending' || status === 'awaiting_acknowledgment' || status === 'suspended') return COLORS.amber;
  if (status === 'denied' || status === 'revoked') return COLORS.red;
  if (status === 'expired') return COLORS.gray;
  return id.startsWith('cert:labview:') || id.startsWith('cert:admin:labs:') ? COLORS.teal : COLORS.blue;
}

export function styleConsolePayload(payload, id) {
  return {
    ...payload,
    ...(payload.embeds ? { embeds: payload.embeds.map(embed => restore(embed, { ...json(embed), color: viewColor(id) })) } : {}),
    ...(payload.components ? { components: payload.components.map(row => {
      const data = json(row);
      return restore(row, { ...data, components: data.components.map(component => {
        const item = json(component);
        const navigation = item.custom_id === 'cert:admin:overview:0' || /^Refresh(?: |$)/.test(item.label || '');
        return item.type === 2 && item.style === 2 && !item.disabled && navigation ? { ...item, style: 1 } : { ...item };
      }) });
    }) } : {})
  };
}

export function withConsolePresentation(route, config, guildId) {
  return async function presentConsole(original) {
    const id = consoleViewId(original);
    if (!id || !config.enabled || original.user?.id !== config.ownerId || original.guildId !== guildId) return route(original);
    const privateMessage = original.message?.flags?.has?.(64) === true;
    const modalHasMessage = !original.isModalSubmit?.() || original.isFromMessage?.() === true;
    const canUpdate = privateMessage && modalHasMessage && typeof original.deferUpdate === 'function';
    const adapter = new Proxy(original, {
      get(target, key) {
        if (key === 'deferReply' && canUpdate) return () => target.deferUpdate();
        if (key === 'editReply') return payload => target.editReply(styleConsolePayload(payload, id));
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    return route(adapter);
  };
}
