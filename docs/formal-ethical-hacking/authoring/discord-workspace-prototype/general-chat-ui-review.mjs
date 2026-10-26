// Target-bound synthetic UI review only. Never loads curriculum, connects a DB or publishes a message.
import { createWorkspace } from './navigation.mjs';
import { createFormalReviewRoute } from './route-boundary.mjs';
export const GENERAL_CHAT_UI_TARGET = Object.freeze({ guildId: '1330353166830665859', channelId: '1330353167371735094', courseId: 'formal-ui-review' });
const issuedUiReviewOptions = new WeakSet();
export function isGeneralChatUiReviewOptions(value, guildId) {
  return guildId === GENERAL_CHAT_UI_TARGET.guildId && issuedUiReviewOptions.has(value);
}
export function readGeneralChatUiReviewFlag(env = {}) {
  const value = env?.GENERAL_CHAT_UI_REVIEW_ENABLED;
  if (value === undefined || value === 'false') return false;
  if (value !== 'true' || env.GUILD_ID !== GENERAL_CHAT_UI_TARGET.guildId) throw new TypeError('Explicit UI-review flag and confirmed guild required');
  return true;
}
const pages = Object.freeze([
  'UI preview 1/3 - Private workspace\n\nThis is synthetic content for checking private navigation from #general-chat. Use Next to continue. No course access, enrollment or progress is granted.',
  'UI preview 2/3 - Navigation\n\nNext, Previous and Home should update the same private workspace. This page is not a lesson. Do not submit files, commands, personal information or learner evidence.',
  'UI preview 3/3 - Test boundaries\n\nThis preview uses no database and collects no evidence. It grants no enrollment, lab permission, saved progress, completion or awards. You can stop testing now.'
]);
export function buildGeneralChatUiReviewEntry() {
  return { guildId: GENERAL_CHAT_UI_TARGET.guildId, channelId: GENERAL_CHAT_UI_TARGET.channelId, payload: {
    content: 'Private workspace UI test - synthetic pages only. No enrollment, evidence submission, saved progress or awards.',
    components: [{ type: 1, components: [{ type: 2, style: 2, custom_id: 'fws:open', label: 'Open private UI test' }] }],
    allowedMentions: { parse: [] }
  } };
}
export function createGeneralChatUiReviewOptions(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => key !== 'enabled') ||
      (options.enabled !== undefined && typeof options.enabled !== 'boolean')) throw new TypeError('Only explicit UI-preview enablement is accepted');
  if (options.enabled !== true) return Object.freeze({ enabled: false });
  const issued = Object.freeze({ enabled: true, reviewOnly: true, mode: 'review', createRoute({ client, guildId, isReady } = {}) {
    if (guildId !== GENERAL_CHAT_UI_TARGET.guildId || typeof client?.guilds?.fetch !== 'function' || typeof isReady !== 'function') {
      throw new TypeError('Confirmed guild, trusted SDK client and parent readiness required');
    }
    const ready = () => {
      try { const value = isReady(); if (value && typeof value.catch === 'function') void value.catch(() => {}); return value === true; }
      catch { return false; }
    };
    return createFormalReviewRoute({ enabled: true, reviewOnly: true, mode: 'review', guildId,
      entryChannelId: GENERAL_CHAT_UI_TARGET.channelId, isReady: ready, createWorkspace() {
        let disposed = false;
        const workspace = createWorkspace({ enabled: true, guildId, entryChannelId: GENERAL_CHAT_UI_TARGET.channelId,
          courseId: GENERAL_CHAT_UI_TARGET.courseId, pages: pages.length, ttlMs: 300000, maxSessions: 16, dependencyTimeoutMs: 1000,
          async authorize(context) {
            if (disposed || !ready() || !context || Object.keys(context).sort().join(',') !== 'actorId,courseId,guildId' ||
                context.guildId !== guildId || context.courseId !== GENERAL_CHAT_UI_TARGET.courseId || !/^[0-9]{17,20}$/.test(context.actorId || '')) return false;
            try {
              const guild = await client.guilds.fetch(guildId);
              if (disposed || !ready() || guild?.id !== guildId || guild.available === false || typeof guild.members?.fetch !== 'function') return false;
              const member = await guild.members.fetch({ user: context.actorId, force: true, cache: false });
              return !disposed && ready() && member?.id === context.actorId && member.guild?.id === guildId;
            } catch { return false; }
          },
          render({ courseId, page }) {
            if (courseId !== GENERAL_CHAT_UI_TARGET.courseId || !Number.isInteger(page) || page < 0 || page >= pages.length) throw new Error('UI page unavailable');
            return pages[page];
          }
        });
        return { handle: interaction => workspace.handle(interaction), dispose() { disposed = true; workspace.dispose(); } };
      } });
  } });
  issuedUiReviewOptions.add(issued);
  return issued;
}
