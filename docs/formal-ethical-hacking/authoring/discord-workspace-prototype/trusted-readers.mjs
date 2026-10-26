// Trusted SDK/read-policy bridge only. No SDK client, listener, login or pool is created.
import { FORMAL_REVIEW_COURSE } from './formal-course.mjs';
const id = v => typeof v === 'string' && /^[0-9]{17,20}$/.test(v);
export function createTrustedReviewReaders({ enabled = false, reviewOnly = false, guildId, client, authorizeCourse } = {}) {
  if (enabled !== true) return Object.freeze({ readMember: async () => null, readCourseGrant: async () => null, dispose() {} });
  if (reviewOnly !== true || !id(guildId) || typeof client?.guilds?.fetch !== 'function' ||
      typeof authorizeCourse !== 'function') throw new TypeError('Explicit trusted detached readers required');
  let disposed = false;
  return Object.freeze({ async readMember(actorId, requestedGuild) {
    if (disposed || !id(actorId) || requestedGuild !== guildId) return null;
    try {
      const guild = await client.guilds.fetch(guildId);
      if (disposed || !guild || guild.id !== guildId || guild.available === false || typeof guild.members?.fetch !== 'function') return null;
      const member = await guild.members.fetch({ user: actorId, force: true, cache: false });
      return !disposed && member?.id === actorId && member.guild?.id === guildId ? member : null;
    } catch { return null; }
  }, async readCourseGrant(actorId, courseKey) {
    if (disposed || !id(actorId) || courseKey !== FORMAL_REVIEW_COURSE.key) return null;
    try {
      const grant = await authorizeCourse(actorId, FORMAL_REVIEW_COURSE.key);
      if (disposed || !grant || typeof grant !== 'object' || Array.isArray(grant) ||
          Object.keys(grant).sort().join(',') !== 'course_key,student_id' ||
          grant.course_key !== FORMAL_REVIEW_COURSE.key || typeof grant.student_id !== 'string' ||
          !grant.student_id.trim() || grant.student_id.length > 128) return null;
      return Object.freeze({ student_id: grant.student_id, course_key: grant.course_key });
    } catch { return null; }
  }, dispose() { disposed = true; } });
}
