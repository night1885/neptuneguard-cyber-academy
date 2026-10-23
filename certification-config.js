import { readRegistrationPilotOptions } from './certification-registration-pilot-guard.js';

export function loadCertificationConfig(env = process.env) {
  const ownerId = env.ACADEMY_OWNER_ID || '1223123544301633567';
  const adminChannelId = env.ACADEMY_ADMIN_CHANNEL_ID || '1339276399390887956';
  for (const [name, value] of Object.entries({ ownerId, adminChannelId })) {
    if (!/^\d{17,20}$/.test(value)) throw new Error(`Invalid certification ${name}`);
  }
  const enabled = env.CERTIFICATION_ENABLED === 'true';
  const flag = env.CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED;
  if (flag !== undefined && flag !== 'true' && flag !== 'false') throw new Error('Invalid enrollment submission flag');
  const enrollmentSubmissionEnabled = flag === 'true';
  const manualFlag = env.CERTIFICATION_MANUAL_REVIEW_ENABLED;
  if (manualFlag !== undefined && manualFlag !== 'true' && manualFlag !== 'false') throw new Error('Invalid manual-review flag');
  const manualReviewEnabled = manualFlag === 'true';
  const decisionFlag = env.CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED;
  if (decisionFlag !== undefined && decisionFlag !== 'true' && decisionFlag !== 'false') throw new Error('Invalid manual-review owner-decision flag');
  const manualReviewDecisionsEnabled = decisionFlag === 'true';
  let manualReviewDecisionStudentIds;
  if (manualReviewDecisionsEnabled) {
    if (!enabled || !manualReviewEnabled) throw new Error('Owner decisions require enabled certification and manual review');
    const pilot = readRegistrationPilotOptions(env);
    if (pilot.enabled !== true || pilot.ownerId !== ownerId || pilot.adminChannelId !== adminChannelId) {
      throw new Error('Owner decisions require explicit restricted registration-pilot settings');
    }
    manualReviewDecisionStudentIds = pilot.studentIds;
  }
  const base = { ownerId, adminChannelId, enabled, enrollmentSubmissionEnabled,
    ...(manualReviewEnabled ? { manualReviewEnabled: true } : {}),
    ...(manualReviewDecisionsEnabled ? { manualReviewDecisionsEnabled: true, manualReviewDecisionStudentIds } : {}) };
  const raw = env.CERTIFICATION_ENROLLMENT_MANIFEST_JSON;
  if (manualReviewEnabled && (!enabled || raw === undefined)) throw new Error('Manual review requires enabled certification and an enrollment manifest');
  if (manualReviewEnabled && (env.CERTIFICATION_REGISTRATION_PILOT !== 'true' || flag !== 'false')) {
    throw new Error('Manual review currently requires the registration pilot and explicitly disabled general enrollment');
  }
  if (!enrollmentSubmissionEnabled && (!enabled || raw === undefined)) return Object.freeze(base);
  if (!enabled) throw new Error('Certification must be enabled before submission configuration');
  if (typeof raw !== 'string' || raw.length > 12000) throw new Error('Valid enrollment manifest required');
  let manifest;
  try { manifest = JSON.parse(raw); } catch { throw new Error('Valid enrollment manifest required'); }
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
  const check = manifest?.comprehensionCheck;
  if (!identifier(manifest?.agreementVersion) || typeof manifest?.agreementSha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(manifest.agreementSha256) || !identifier(check?.version) ||
      !Array.isArray(check?.questions) || check.questions.length < 1 || check.questions.length > 3 ||
      !check.questions.every(q => typeof q?.prompt === 'string' && q.prompt.trim().length > 0 && q.prompt.length <= 300) ||
      !Array.isArray(check?.correctAnswers) || check.correctAnswers.length !== check.questions.length ||
      !check.correctAnswers.every(a => typeof a === 'string' && a.trim().length > 0 && a.length <= 100)) {
    throw new Error('Valid enrollment agreement and comprehension configuration required');
  }
  const questions = Object.freeze(check.questions.map(q => Object.freeze({ prompt: q.prompt })));
  const comprehensionCheck = Object.freeze({ version: check.version, questions, correctAnswers: Object.freeze([...check.correctAnswers]) });
  return Object.freeze({ ...base, activeAgreementVersion: manifest.agreementVersion,
    activeAgreementSha256: manifest.agreementSha256, comprehensionCheck });
}

export function isCertificationOwner(interaction, config) {
  return interaction.user?.id === config.ownerId;
}
