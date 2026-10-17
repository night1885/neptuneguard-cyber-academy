import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createReadyCertificationApplicationClosure } from './certification-application-closure-readiness.js';
import { createCertificationRouter } from './certification-admin-router.js';
import { applicationDeletionEligibleAt } from './certification-retention-deadlines.js';

const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const categories = ['denied', 'withdrawn', 'abandoned'];
const fields = ['application_closed_at', 'application_closed_by', 'application_closed_as'];
const button = (id, label, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const controls = (...buttons) => new ActionRowBuilder().addComponents(buttons);
const readSql = `SELECT discord_user_id,status,student_id,approved_by,approved_at,
  application_closed_at,application_closed_by,application_closed_as
  FROM certification_enrollments WHERE discord_user_id=$1`;

export function buildApplicationClosureEntry(studentId) {
  if (!validId(studentId)) throw new Error('Invalid student Discord ID');
  return controls(button(`cert:closure:open:${studentId}`, 'Application closure'));
}

// Explicit async composition only; the existing runtime does not call this factory.
export async function createClosureEnabledAdminRouter(pool, config, guildId, {
  now = Date.now, createService = createReadyCertificationApplicationClosure, createBaseRouter = createCertificationRouter
} = {}) {
  if (config?.enabled !== true || !validId(config.ownerId) || !validId(guildId) ||
      [now, createService, createBaseRouter].some(value => typeof value !== 'function')) throw new Error('Explicit enabled owner, guild, and valid closure dependencies required');
  const settings = Object.freeze({ ...config });
  const service = await createService(pool, settings);
  if (typeof service?.closeApplication !== 'function') throw new Error('Ready closure service required');
  const route = createBaseRouter(pool, settings, guildId);
  if (typeof route !== 'function') throw new Error('Admin router required');
  const pending = new Map();
  const authorized = interaction => interaction.user?.id === settings.ownerId && interaction.guildId === guildId;
  const respond = (interaction, payload) => {
    const message = { embeds: [], components: [], ...payload, allowedMentions: { parse: [] } };
    return interaction.deferred || interaction.replied ? interaction.editReply(message) : interaction.reply({ ...message, flags: 64 });
  };
  async function inspect(studentId) {
    const record = (await pool.query(readSql, [studentId])).rows[0];
    if (!record) return { eligible: false, text: 'Application record not found.' };
    if (!fields.every(field => Object.hasOwn(record, field))) throw new Error('Closure metadata unavailable');
    if (fields.some(field => record[field] != null)) {
      if (record.status !== 'denied' || record.student_id != null || record.approved_by != null || record.approved_at != null ||
          !categories.includes(record.application_closed_as) || !validId(record.application_closed_by) || record.application_closed_at == null) throw new Error('Inconsistent closure record');
      const deadline = applicationDeletionEligibleAt(record.application_closed_at).toISOString();
      return { eligible: false, text: `Application already closed as ${record.application_closed_as}.\nClosed at: ${new Date(record.application_closed_at).toISOString()}\nDeletion eligibility: ${deadline}. No deletion is performed here.` };
    }
    const eligible = ['awaiting_acknowledgment', 'pending', 'denied'].includes(record.status) &&
      record.student_id == null && record.approved_by == null && record.approved_at == null;
    return { eligible, text: eligible ? 'Choose an explicit application closure category. This is not course completion.' : 'This record is not eligible for application closure. Issued-ID, previously approved, and other access states require separate review.' };
  }

  return async function routeWithApplicationClosure(interaction) {
    const id = interaction.customId || '';
    if (!id.startsWith('cert:closure:')) {
      const detail = /^cert:students:detail:([0-9]{17,20})$/.exec(id);
      if (!detail || !authorized(interaction) || !interaction.isButton?.()) return route(interaction);
      const adapter = new Proxy(interaction, { get(target, key) {
        if (key === 'editReply') return payload => {
          const rows = payload.components || [];
          return target.editReply(payload.embeds?.length && rows.length < 5
            ? { ...payload, components: [...rows, buildApplicationClosureEntry(detail[1])] } : payload);
        };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      return route(adapter);
    }
    if (!authorized(interaction)) {
      await respond(interaction, { content: 'Owner authorization in the configured server is required.' }); return true;
    }
    if (!interaction.isButton?.()) {
      await respond(interaction, { content: 'Invalid closure interaction. Open the student record again.' }); return true;
    }
    let issuedToken;
    try {
      const time = now();
      if (!Number.isSafeInteger(time) || time < 0 || time > Number.MAX_SAFE_INTEGER - 300000) throw new Error('Invalid confirmation clock');
      for (const [token, record] of pending) if (record.expiresAt <= time) pending.delete(token);
      const confirmation = /^cert:closure:(confirm|cancel):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(id);
      if (confirmation) {
        const record = pending.get(confirmation[2]);
        if (!record || record.actorId !== interaction.user.id || record.guildId !== interaction.guildId) {
          await respond(interaction, { content: 'Confirmation expired, was already used, or was invalidated by a restart. Start again.' }); return true;
        }
        pending.delete(confirmation[2]);
        if (confirmation[1] === 'cancel') {
          await respond(interaction, { content: 'Canceled. This confirmation did not change an application.' }); return true;
        }
        await interaction.deferReply({ flags: 64 });
        const result = await service.closeApplication(record.actorId, record.studentId, record.category);
        await respond(interaction, { content: `Discord user: ${record.studentId}\nApplication ${result.alreadyClosed ? 'was already closed' : 'closed'} as ${result.closureCategory}.\nClosed at: ${result.closedAt}\nDeletion eligibility: ${result.deletionEligibleAt}\nNo record was deleted and no deletion job was scheduled by this action.` });
        return true;
      }
      const open = /^cert:closure:open:([0-9]{17,20})$/.exec(id);
      const choose = /^cert:closure:choose:(denied|withdrawn|abandoned):([0-9]{17,20})$/.exec(id);
      if (!open && !choose) {
        await respond(interaction, { content: 'Invalid closure action. Open the student record again.' }); return true;
      }
      const studentId = open ? open[1] : choose[2];
      await interaction.deferReply({ flags: 64 });
      const state = await inspect(studentId);
      if (!state.eligible) { await respond(interaction, { content: `Discord user: ${studentId}\n${state.text}` }); return true; }
      if (open) {
        await respond(interaction, { content: `Discord user: ${studentId}\n${state.text}\nSelecting a category only opens a confirmation.`, components: [controls(...categories.map(category =>
          button(`cert:closure:choose:${category}:${studentId}`, `Close as ${category}`)))] });
        return true;
      }
      if (pending.size >= 100) {
        await respond(interaction, { content: 'Too many pending closure confirmations. Cancel one or retry after five minutes.' }); return true;
      }
      issuedToken = randomUUID();
      pending.set(issuedToken, { actorId: interaction.user.id, guildId, studentId, category: choose[1], expiresAt: time + 300000 });
      await respond(interaction, { content: `Confirm application closure?\nDiscord user: ${studentId}\nCategory: ${choose[1]}\nThis ends the application workflow, not a course. The service checks the current record again. Retention eligibility is calculated from the recorded closure time under the approved three-business-day rule. No deletion runs here.\nThis confirmation expires in five minutes and can be used once.`, components: [controls(
        button(`cert:closure:confirm:${issuedToken}`, 'Confirm closure', ButtonStyle.Danger),
        button(`cert:closure:cancel:${issuedToken}`, 'Cancel'))] });
      issuedToken = undefined;
      return true;
    } catch {
      if (issuedToken) pending.delete(issuedToken);
      await respond(interaction, { content: 'Application closure could not be confirmed. Review the current application record before trying again.' });
      return true;
    }
  };
}
