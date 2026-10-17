import { createCertificationService } from './certification-service.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';

// ID confirmation supplements Discord identity; it is not a standalone credential.
export function createSectionIdentityVerifier(pool, config, guildId, { sections, readLimits = {}, authorizeCourseSection } = {}) {
  if (typeof guildId !== 'string' || !/^\d{17,20}$/.test(guildId) || !Array.isArray(sections) || sections.length < 1 || sections.length > 100 ||
      sections.some(section => typeof section !== 'string' || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(section)) || new Set(sections).size !== sections.length) {
    throw new Error('Configured guild and explicit unique section allowlist required');
  }
  if (authorizeCourseSection !== undefined && typeof authorizeCourseSection !== 'function') throw new Error('Invalid course-section authorizer');
  const allowed = new Set(sections), service = authorizeCourseSection ? null : createCertificationService(pool, config), guard = createStatusReadGuard(readLimits);
  return Object.freeze({
    async verify({ discordUserId, guildId: serverId, studentId, section } = {}) {
      if (config.enabled !== true || serverId !== guildId || typeof discordUserId !== 'string' || !/^\d{17,20}$/.test(discordUserId) ||
          !allowed.has(section) || typeof studentId !== 'string' || studentId.length > 100 || !studentId.trim()) return false;
      const submitted = studentId.trim();
      try {
        const authorization = await guard.run(discordUserId, () => authorizeCourseSection
          ? authorizeCourseSection(discordUserId, section) : service.getCourseAuthorization(discordUserId));
        return Boolean(authorization && authorization.student_id === submitted && (!authorizeCourseSection || authorization.course_key === section));
      } catch { return false; }
    }
  });
}
