import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

function forward(interaction, customId, edit) {
  return new Proxy(interaction, { get(target, property) {
    if (property === 'customId') return customId;
    if (property === 'editReply') return payload => edit(target, payload);
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
}
export function withOwnerQueueContext(interaction) {
  let view; let page = 0;
  if (interaction.isStringSelectMenu?.() === true && interaction.customId === 'cert:console:section' && interaction.values?.length === 1 && ['directory', 'restricted', 'enrollments'].includes(interaction.values[0])) view = interaction.values[0];
  else if (interaction.isButton()) { const match = /^cert:console:(directory|restricted|enrollments):(\d{1,6})$/.exec(interaction.customId); if (match) { view = match[1]; page = Number(match[2]); } }
  if (!view) return interaction;
  return forward(interaction, interaction.customId, async (target, payload) => {
    for (const row of payload.components || []) for (const control of row.components || []) {
      if (/^cert:(students:detail|enrollment:review):\d{17,20}$/.test(control.data?.custom_id || '')) control.setCustomId(`${control.data.custom_id}:${view}:${page}`);
    }
    return target.editReply(payload);
  });
}
export async function handleContextualOwnerRecord(interaction, route) {
  if (!interaction.isButton()) return false;
  const match = /^cert:(students:detail|enrollment:review|enrollment:approve):(\d{17,20}):(directory|restricted|enrollments):(\d{1,6})$/.exec(interaction.customId || '');
  if (!match) return false;
  const [, action, learner, view, pageText] = match; const page = Number(pageText); const legacyId = `cert:${action}:${learner}`;
  const contextualId = `${legacyId}:${view}:${page}`; const backId = `cert:console:${view}:${page}`;
  const label = view === 'restricted' ? 'restrictions' : view === 'enrollments' ? 'enrollments' : 'directory';
  const recordId = `cert:students:detail:${learner}:${view}:${page}`;
  const forwarded = forward(interaction, legacyId, async (target, payload) => {
    for (const row of payload.components || []) for (const control of row.components || []) {
      if (control.data?.custom_id === 'cert:console:directory:0') control.setCustomId(backId).setLabel(`Back to ${label} · page ${page + 1}`);
      else if (control.data?.custom_id === legacyId) control.setCustomId(contextualId);
      else if (control.data?.custom_id === `cert:enrollment:review:${learner}`) control.setCustomId(`cert:enrollment:review:${learner}:${view}:${page}`);
      else if (control.data?.custom_id === `cert:enrollment:approve:${learner}`) control.setCustomId(`cert:enrollment:approve:${learner}:${view}:${page}`);
      else if (control.data?.custom_id === `cert:enrollment:cancel:${learner}`) control.setCustomId(backId).setLabel('Cancel and return to queue');
      else if (new RegExp(`^cert:access:(deny|suspend|revoke|reinstate):${learner}$`).test(control.data?.custom_id || '')) control.setCustomId(`${control.data.custom_id}:${view}:${page}`);
    }
    if (action === 'enrollment:review' && payload.embeds?.length && payload.components?.length) payload.components.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(recordId).setLabel('View learner record').setStyle(ButtonStyle.Secondary)));
    if (action === 'enrollment:approve' && /^(Enrollment approved\.|Already approved\.)/.test(payload.content || '')) {
      payload.components = [...(payload.components || []), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(backId).setLabel(`Back to ${label} · page ${page + 1}`).setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(recordId).setLabel('View learner record').setStyle(ButtonStyle.Secondary))];
    }
    return target.editReply(payload);
  });
  return route(forwarded);
}
