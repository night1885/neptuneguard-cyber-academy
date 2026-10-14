function forward(interaction, customId, edit) {
  return new Proxy(interaction, { get(target, property) {
    if (property === 'customId') return customId;
    if (property === 'editReply') return payload => edit(target, payload);
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
}
export function withOwnerQueueContext(interaction) {
  let view; let page = 0;
  if (interaction.isStringSelectMenu?.() === true && interaction.customId === 'cert:console:section' && interaction.values?.length === 1 && ['directory', 'restricted'].includes(interaction.values[0])) view = interaction.values[0];
  else if (interaction.isButton()) { const match = /^cert:console:(directory|restricted):(\d{1,6})$/.exec(interaction.customId); if (match) { view = match[1]; page = Number(match[2]); } }
  if (!view) return interaction;
  return forward(interaction, interaction.customId, async (target, payload) => {
    for (const row of payload.components || []) for (const control of row.components || []) {
      const match = /^cert:students:detail:(\d{17,20})$/.exec(control.data?.custom_id || '');
      if (match) control.setCustomId(`${control.data.custom_id}:${view}:${page}`);
    }
    return target.editReply(payload);
  });
}
export async function handleContextualOwnerRecord(interaction, route) {
  if (!interaction.isButton()) return false;
  const match = /^cert:students:detail:(\d{17,20}):(directory|restricted):(\d{1,6})$/.exec(interaction.customId || '');
  if (!match) return false;
  const [, learner, view, pageText] = match; const page = Number(pageText); const legacyId = `cert:students:detail:${learner}`;
  const contextualId = `${legacyId}:${view}:${page}`;
  const forwarded = forward(interaction, legacyId, async (target, payload) => {
    for (const row of payload.components || []) for (const control of row.components || []) {
      if (control.data?.custom_id === 'cert:console:directory:0') control.setCustomId(`cert:console:${view}:${page}`).setLabel(`Back to ${view === 'restricted' ? 'restrictions' : 'directory'} · page ${page + 1}`);
      else if (control.data?.custom_id === legacyId) control.setCustomId(contextualId);
    }
    return target.editReply(payload);
  });
  return route(forwarded);
}
