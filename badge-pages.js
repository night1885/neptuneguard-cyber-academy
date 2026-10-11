import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildBadgePage(badges, page = 0) {
  const count = Math.max(1, Math.ceil(badges.length / 6));
  if (!Number.isInteger(page) || page < 0 || page >= count) throw new Error('Invalid badge page');
  const lines = ['## Your NeptuneGuard Badges', `Page ${page + 1}/${count} · ${badges.length} badge(s)`, ''];
  if (!badges.length) lines.push('No badges yet. Complete module activities to earn them.');
  for (const badge of badges.slice(page * 6, page * 6 + 6)) {
    const name = String(badge.badge_name).replace(/[\r\n]/g, ' ').slice(0, 140);
    const time = new Date(badge.earned_at).getTime();
    lines.push(`${name}${Number.isFinite(time) ? ` — earned <t:${Math.floor(time / 1000)}:D>` : ''}`);
  }
  const components = [];
  if (count > 1) components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`badge-page:${page - 1}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`badge-page:${page + 1}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page === count - 1)));
  return {content: lines.join('\n'), components, allowedMentions: {parse: []}};
}
// Caller must defer and verify guild and Verified role first.
export async function showBadgePage(interaction, pool, page = 0) {
  const {rows} = await pool.query(`SELECT badge_name,earned_at FROM learner_badges
    WHERE discord_user_id=$1 ORDER BY earned_at ASC,badge_key ASC`, [interaction.user.id]);
  const last = Math.max(0, Math.ceil(rows.length / 6) - 1);
  const selected = Number.isInteger(page) && page >= 0 ? Math.min(page,last) : 0;
  await interaction.editReply(buildBadgePage(rows,selected));
}
