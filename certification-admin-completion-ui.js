import { randomUUID } from 'node:crypto';
const prefix = 'cert:admincomplete:';
const validId = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const validKey = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value);
const control = (custom_id, label, style = 2) => ({ type: 2, custom_id, label, style });

export function createAdministratorCompletionControls({ guildId, courseKeys, verifyAdministrator, service, now = Date.now } = {}) {
  if (!validId(guildId) || !Array.isArray(courseKeys) || !courseKeys.length || courseKeys.length > 50 || !courseKeys.every(validKey) || new Set(courseKeys).size !== courseKeys.length || typeof verifyAdministrator !== 'function' || typeof service?.completeCourse !== 'function' || typeof now !== 'function') throw new Error('Explicit completion context, trusted verifier and backend required');
  const allowed = new Set(courseKeys), pending = new Map(); let disposed = false;
  const stamp = () => { const time = now(); if (!Number.isSafeInteger(time) || time < 0 || time > Number.MAX_SAFE_INTEGER - 300000) throw new Error('Invalid confirmation clock'); return time; };
  const context = i => {
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    return !disposed && i.guildId === guildId && validId(i.user?.id) && i.isButton?.() === true && !(i.message?.flags?.has?.(64) === true && origin && origin !== i.user.id);
  };
  const respond = (i, payload) => { const message = { content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } }; return i.deferred || i.replied ? i.editReply(message) : i.reply({ ...message, flags: 64 }); };
  async function authorize(i) {
    let ok = false; try { ok = await verifyAdministrator(i.user.id) === true; } catch {}
    if (!ok || !context(i)) throw new Error('Current Administrator required');
  }
  async function handle(i) {
    const customId = i.customId; if (typeof customId !== 'string' || !customId.startsWith(prefix)) return false;
    let issued;
    try {
      if (!context(i)) throw new Error('Invalid completion context');
      const request = /^cert:admincomplete:request:([0-9]{17,20}):([a-z0-9][a-z0-9-]{0,39})$/.exec(customId);
      const decision = /^cert:admincomplete:(confirm|cancel):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(customId);
      const time = stamp();
      for (const [token, record] of pending) if (record.expiresAt <= time) pending.delete(token);
      if (decision) {
        const record = pending.get(decision[2]);
        if (!record || record.actor !== i.user.id || record.guild !== i.guildId) throw new Error('Invalid confirmation');
        pending.delete(decision[2]);
        await i.deferReply({ flags: 64 });
        if (decision[1] === 'cancel') { await respond(i, { content: 'Canceled. No completion was requested from the backend.' }); return true; }
        await authorize(i);
        if (stamp() >= record.expiresAt) throw new Error('Expired confirmation');
        const result = await service.completeCourse(record.actor, record.subject, record.courseKey);
        await respond(i, { content: `${result.alreadyCompleted ? 'Completion was already recorded.' : 'Completion recorded.'} Discord user: ${record.subject}. Course: ${record.courseKey}. No certificate was issued and no records were deleted.` });
        return true;
      }
      if (!request || !allowed.has(request[2])) throw new Error('Invalid requested course');
      await i.deferReply({ flags: 64 }); await authorize(i);
      const current = stamp();
      for (const [token, record] of pending) if (record.expiresAt <= current) pending.delete(token);
      if (pending.size >= 100) throw new Error('Confirmation limit reached');
      issued = randomUUID();
      pending.set(issued, Object.freeze({ actor: i.user.id, guild: guildId, subject: request[1], courseKey: request[2], expiresAt: current + 300000 }));
      await respond(i, { content: `Confirm course completion for Discord user ${request[1]}? Course: ${request[2]}. The backend checks current permission and enrollment. This single-use confirmation expires in five minutes. It does not award a certificate or authorize deletion.`, components: [{ type: 1, components: [control(`${prefix}confirm:${issued}`, 'Confirm completion', 4), control(`${prefix}cancel:${issued}`, 'Cancel')] }] });
      issued = undefined; return true;
    } catch {
      if (issued) pending.delete(issued);
      await respond(i, { content: 'Completion could not be confirmed. Check your current Administrator permission and the learner/course record, then start again. If a backend or delivery error occurred, inspect the current record before retrying.' });
      return true;
    }
  }
  return Object.freeze({ handle, dispose() { disposed = true; pending.clear(); } });
}
