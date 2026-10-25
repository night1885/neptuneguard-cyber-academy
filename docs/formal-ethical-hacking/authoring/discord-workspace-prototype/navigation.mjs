// Standalone synthetic navigation slice. Not attached to the academy client.
import { randomBytes } from 'node:crypto';

const OPEN = 'fws:open';
const NOTICE = 'Workspace unavailable. Use the course entry button to reopen.';
const neutral = () => ({ content: NOTICE, embeds: [], components: [], allowedMentions: { parse: [] } });
const privateMessage = message => message?.flags?.has?.(64) === true;

export function createWorkspace({ enabled = false, guildId, entryChannelId, courseId,
  pages = 3, ttlMs = 600000, maxSessions = 128, dependencyTimeoutMs = 2000, authorize, render,
  clock = Date.now, makeToken = () => randomBytes(16).toString('hex') } = {}) {
  if (enabled !== true) return { handle: async () => false, dispose() {} };
  if (![guildId, entryChannelId].every(value => /^[0-9]{17,20}$/.test(value ?? '')) ||
      typeof courseId !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(courseId) ||
      !Number.isInteger(pages) || pages < 1 || pages > 100 ||
      !Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 840000 ||
      !Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 256 ||
      !Number.isInteger(dependencyTimeoutMs) || dependencyTimeoutMs < 100 || dependencyTimeoutMs > 5000 ||
      ![authorize, render, clock, makeToken].every(fn => typeof fn === 'function')) {
    throw new TypeError('Explicit reviewed navigation configuration required');
  }
  const sessions = new Map(), actors = new Map(), busy = new Set();
  let stopped = false, pending = 0;
  const drop = row => {
    sessions.delete(row.token);
    if (actors.get(row.actorId) === row.token) actors.delete(row.actorId);
  };
  const prune = () => {
    for (const row of sessions.values()) if (clock() >= row.expires) drop(row);
  };
  const bounded = async operation => {
    let timer;
    try {
      return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Unavailable')), dependencyTimeoutMs);
      })]);
    } finally { clearTimeout(timer); }
  };
  const check = async row => {
    if (stopped || clock() >= row.expires || await bounded(() => authorize({
      actorId: row.actorId, guildId, courseId
    })) !== true || stopped || clock() >= row.expires) throw new Error('Unavailable');
  };
  const frame = async row => {
    await check(row);
    const content = await bounded(() => render({ courseId, page: row.page }));
    if (typeof content !== 'string' || !content.trim() || content.length > 1800) throw new Error('Unavailable');
    await check(row);
    return { content, embeds: [], allowedMentions: { parse: [] }, components: [{
      type: 1, components: ['prev', 'home', 'next'].map((action, index) => ({
        type: 2, style: 2, label: ['Previous', 'Home', 'Next'][index],
        custom_id: `fws:${row.token}:${row.version}:${action}`,
        disabled: action === 'prev' && row.page === 0 || action === 'next' && row.page === pages - 1
      }))
    }] };
  };
  const deny = async interaction => {
    if (interaction.deferred || interaction.replied) await interaction.editReply(neutral());
    else await interaction.reply({ ...neutral(), flags: 64 });
  };
  async function handle(interaction) {
    if (stopped || interaction.isButton?.() !== true ||
        typeof interaction.customId !== 'string' || !interaction.customId.startsWith('fws:')) return false;
    // A caller must route genuine, unacknowledged SDK interactions, never client JSON.
    if (interaction.deferred || interaction.replied) return true;
    prune();
    const actorId = interaction.user?.id;
    if (!/^[0-9]{17,20}$/.test(actorId ?? '') || interaction.guildId !== guildId ||
        interaction.channelId !== entryChannelId || busy.has(actorId)) {
      try { await deny(interaction); } catch {} return true;
    }
    busy.add(actorId);
    let row, reserved = false;
    try {
      if (interaction.customId === OPEN) {
        const previous = sessions.get(actors.get(actorId));
        if (previous) drop(previous);
        // Acknowledge before async authorization/rendering; no protected content yet.
        await interaction.deferReply({ flags: 64 });
        if (interaction.ephemeral !== true) throw new Error('Unavailable');
        const token = makeToken();
        if (typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token) || sessions.has(token) ||
            sessions.size + pending >= maxSessions) throw new Error('Unavailable');
        pending++; reserved = true;
        row = { actorId, token, page: 0, version: 0, expires: clock() + ttlMs, messageId: null };
        const payload = await frame(row);
        const message = await interaction.editReply(payload);
        if (!privateMessage(message) || !/^[0-9]{17,20}$/.test(message.id ?? '') || stopped) throw new Error('Unavailable');
        row.messageId = message.id;
        sessions.set(token, row); actors.set(actorId, token);
      } else {
        const match = /^fws:([a-f0-9]{32}):([0-9]{1,6}):(prev|home|next)$/.exec(interaction.customId);
        row = match && sessions.get(match[1]);
        if (!row || row.actorId !== actorId || !privateMessage(interaction.message) ||
            interaction.message.id !== row.messageId || Number(match[2]) !== row.version) {
          row = undefined; await deny(interaction); return true;
        }
        await interaction.deferUpdate();
        const page = match[3] === 'home' ? 0 : row.page + (match[3] === 'next' ? 1 : -1);
        if (page < 0 || page >= pages || row.version >= 999999) throw new Error('Unavailable');
        const candidate = { ...row, page, version: row.version + 1 };
        const payload = await frame(candidate);
        await interaction.editReply(payload);
        Object.assign(row, { page, version: candidate.version });
      }
    } catch {
      if (row) drop(row);
      try { await deny(interaction); } catch {}
    } finally { if (reserved) pending--; busy.delete(actorId); }
    return true;
  }
  return { handle, dispose() { stopped = true; sessions.clear(); actors.clear(); } };
}
