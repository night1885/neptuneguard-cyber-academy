import { COMMUNITY_COURSES, classifyCommunityInteraction, createCommunityAdmission } from './community-learning-policy.mjs';
const titles = { 'linux-fundamentals': 'Linux Fundamentals', 'linux-administration': 'Linux Administration', 'linux-security-engineering': 'Linux Security Engineering' };
const notice = 'Community learning only. This does not enroll you in Ethical Hacking or Incident Response, authorize restricted labs, or issue a formal certificate.';
export function createCommunityRouter({ pool, options, ready = () => false, showCourse, handleActivity, renderBadges, badgeKeys } = {}) {
  if (typeof pool?.query !== 'function' || [ready, showCourse, handleActivity, renderBadges].some(fn => typeof fn !== 'function') ||
      !Array.isArray(badgeKeys) || !badgeKeys.length || badgeKeys.some(key => typeof key !== 'string' || !key.trim())) throw new Error('Trusted community handlers, badge keys and storage required');
  const keys = Object.freeze([...new Set(badgeKeys)]);
  const current = async actor => {
    const result = await pool.query('SELECT current_path_slug FROM learner_profiles WHERE discord_user_id=$1', [actor]);
    if (!Array.isArray(result.rows) || result.rows.length > 1) throw new Error('Ambiguous community profile');
    return result.rows[0]?.current_path_slug ?? null;
  };
  const admit = createCommunityAdmission(options, { resolveCurrentCourse: current });
  return async i => {
    if (!classifyCommunityInteraction(i).handled) return false;
    await i.deferReply({ flags: 64 });
    const respond = payload => i.editReply({ content: '', embeds: [], components: [], ...payload, allowedMentions: { parse: [] } });
    const say = content => respond({ content });
    try {
      if (ready() !== true) { await say('Community learning is unavailable pending startup checks. No community activity was performed.'); return true; }
      const result = await admit(i);
      if (result.allowed !== true) {
        await say(result.reason === 'verification_required' ? 'Complete server verification before using community learning.' : result.reason === 'course_not_available' ? 'Choose one of the three Linux community paths with /begin. SOC and formal academy courses are not available through community learning.' : 'Community access could not be verified. Reopen your own panel in the configured server or retry later.');
        return true;
      }
      if (ready() !== true) { await say('Community learning became unavailable. No activity was dispatched.'); return true; }
      const actor = i.user.id;
      if (result.kind === 'start') {
        await pool.query('INSERT INTO learner_profiles (discord_user_id) VALUES ($1) ON CONFLICT (discord_user_id) DO NOTHING', [actor]);
        await say('Welcome to Community Learning. Use /catalog, /begin, /continue, /progress or /badges.\n' + notice);
      } else if (result.kind === 'catalog') {
        await say('Community Learning\n' + COMMUNITY_COURSES.map(key => titles[key] + ' — /begin path:' + key).join('\n') + '\n\n' + notice);
      } else if (result.kind === 'begin') {
        await pool.query(`INSERT INTO learner_profiles (discord_user_id,current_path_slug,last_activity_at) VALUES ($1,$2,NOW())
          ON CONFLICT (discord_user_id) DO UPDATE SET current_path_slug=EXCLUDED.current_path_slug,last_activity_at=NOW()`, [actor, result.courseKey]);
        await say('Selected ' + titles[result.courseKey] + '. Use /continue to open it. Existing module progress was not reset.\n' + notice);
      } else if (result.kind === 'continue') {
        await showCourse(i, pool, result.courseKey);
      } else if (result.kind === 'progress') {
        const { rows } = await pool.query(`SELECT course_key, COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed_modules,
          COALESCE(SUM(xp_earned),0)::int AS earned_xp FROM learner_module_progress
          WHERE discord_user_id=$1 AND course_key=ANY($2::text[]) GROUP BY course_key`, [actor, [...COMMUNITY_COURSES]]);
        const lines = COMMUNITY_COURSES.map(key => {
          const entry = rows.find(row => row.course_key === key);
          return titles[key] + ': ' + (entry?.completed_modules ?? 0) + ' modules complete; ' + (entry?.earned_xp ?? 0) + ' community XP';
        });
        await say('Your Community Learning Progress\n' + lines.join('\n') + '\n\n' + notice);
      } else if (result.kind === 'badges' || result.kind === 'badge-button') {
        const { rows } = await pool.query(`SELECT badge_name,earned_at FROM learner_badges
          WHERE discord_user_id=$1 AND badge_key=ANY($2::text[]) ORDER BY earned_at ASC,badge_key ASC`, [actor, [...keys]]);
        const requested = result.kind === 'badge-button' ? Number(i.customId.split(':')[1]) : 0;
        const page = Math.min(requested, Math.max(0, Math.ceil(rows.length / 6) - 1));
        const payload = renderBadges(rows, page);
        await respond({ ...payload, content: String(payload.content || '') + '\nCommunity badges only; not formal-course awards.' });
      } else if (result.kind === 'course-button') {
        if (await current(actor) !== result.courseKey) { await say('Select the matching Linux community path with /begin first.'); return true; }
        let customId = i.customId;
        const open = /^linux-open-m([12])$/.exec(customId);
        const legacy = /^linux-m([12])-(.+)$/.exec(customId);
        if (open) customId = 'academy:linux-fundamentals:' + open[1] + ':open';
        else if (legacy) {
          const action = ['lesson', 'lab'].includes(legacy[2]) ? legacy[2] + ':0' : legacy[2];
          customId = 'academy:linux-fundamentals:' + legacy[1] + ':' + action;
        }
        const adapter = new Proxy(i, { get(target, key) {
          if (key === 'customId') return customId;
          const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
        } });
        await handleActivity(adapter, pool);
      }
      return true;
    } catch {
      await say('Community learning could not complete this request. Check your current progress before retrying. No formal enrollment or access change was requested.');
      return true;
    }
  };
}
