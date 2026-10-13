import { requireEligibleCertificationAge } from './certification-age-eligibility.js';
import { createCertificationSubmission } from './certification-submission.js';

export function createAgeCheckedCertificationSubmission(pool, config) {
  const service = createCertificationSubmission(pool, config);
  return Object.freeze({
    async submitEnrollment(studentDiscordId, submission) {
      if (!submission || typeof submission !== 'object' || Array.isArray(submission)) throw new Error('Invalid enrollment submission');
      requireEligibleCertificationAge(submission.reportedAge);
      const { reportedAge, ...acknowledgment } = submission;
      return service.submitEnrollment(studentDiscordId, acknowledgment);
    }
  });
}
