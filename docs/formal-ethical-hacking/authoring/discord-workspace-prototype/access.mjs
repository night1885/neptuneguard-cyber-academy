// Detached read-only adapter contract. No database or Discord client is constructed.
const snowflake = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const course = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(value);
export function createAccessAdapter({ enabled = false, guildId, courseId, verifiedRoleId,
  readMember, readCourseGrant, readTimeoutMs = 400 } = {}) {
  if (enabled !== true) return async () => false;
  if (!snowflake(guildId) || !snowflake(verifiedRoleId) || !course(courseId) ||
      typeof readMember !== 'function' || typeof readCourseGrant !== 'function' ||
      !Number.isInteger(readTimeoutMs) || readTimeoutMs < 100 || readTimeoutMs > 1000) {
    throw new TypeError('Explicit reviewed read adapters required');
  }
  async function bounded(operation) {
    let timer;
    try { return await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Unavailable')), readTimeoutMs);
    })]); } finally { clearTimeout(timer); }
  }
  const memberMatches = (member, actorId) => member?.id === actorId && member.guild?.id === guildId &&
    member.roles?.cache?.has?.(verifiedRoleId) === true;
  return async context => {
    try {
      if (!context || !snowflake(context.actorId) || context.guildId !== guildId || context.courseId !== courseId ||
          Object.keys(context).sort().join(',') !== 'actorId,courseId,guildId') return false;
      const actorId = context.actorId;
      if (!memberMatches(await bounded(() => readMember(actorId, guildId)), actorId)) return false;
      const grant = await bounded(() => readCourseGrant(actorId, courseId));
      if (!grant || typeof grant !== 'object' || Array.isArray(grant) || Object.keys(grant).sort().join(',') !== 'course_key,student_id' ||
          grant.course_key !== courseId || typeof grant.student_id !== 'string' ||
          !grant.student_id.trim() || grant.student_id.length > 128) return false;
      return memberMatches(await bounded(() => readMember(actorId, guildId)), actorId);
    } catch { return false; }
  };
}
