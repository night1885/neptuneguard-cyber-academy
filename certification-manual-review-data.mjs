const validVersion = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value);
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const own = (value, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('Invalid review data');
  return descriptor.value;
};
export function createManualReviewSnapshot(config, responses) {
  const check = config?.comprehensionCheck;
  if (!validVersion(check?.version) || !Array.isArray(check.questions) || check.questions.length < 1 ||
      check.questions.length > 3 || !Array.isArray(check.correctAnswers) ||
      check.correctAnswers.length !== check.questions.length) throw new Error('Invalid review configuration');
  if (!Array.isArray(responses) || responses.length !== check.questions.length) throw new Error('Answer every comprehension question');
  const items = check.questions.map((question, index) => {
    const response = own(responses, String(index));
    if (!text(question?.prompt, 300) || !text(check.correctAnswers[index], 100)) throw new Error('Invalid review configuration');
    if (!text(response, 100)) throw new Error('Answer every comprehension question');
    return Object.freeze({ question: question.prompt, response, expectedAnswer: check.correctAnswers[index] });
  });
  return Object.freeze({ formatVersion: 'manual-review-v1', checkVersion: check.version, items: Object.freeze(items) });
}
export function isManualReviewSnapshot(value) {
  try {
    if (!value || Array.isArray(value) || typeof value !== 'object' ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== 3 ||
        own(value, 'formatVersion') !== 'manual-review-v1' || !validVersion(own(value, 'checkVersion'))) return false;
    const items = own(value, 'items');
    if (!Array.isArray(items) || items.length < 1 || items.length > 3) return false;
    for (let i = 0; i < items.length; i++) {
      const item = own(items, String(i));
      if (!item || typeof item !== 'object' || Array.isArray(item) ||
          ![Object.prototype, null].includes(Object.getPrototypeOf(item)) || Reflect.ownKeys(item).length !== 3 ||
          !text(own(item, 'question'), 300) || !text(own(item, 'response'), 100) ||
          !text(own(item, 'expectedAnswer'), 100)) return false;
    }
    return true;
  } catch { return false; }
}
export function hasSubmittedManualReview(record) {
  return Boolean(record?.comprehension_submitted_at && record.comprehension_passed_at == null &&
    isManualReviewSnapshot(record.comprehension_review_snapshot) &&
    record.comprehension_review_snapshot.checkVersion === record.comprehension_check_version);
}
export function ownerManualReviewItems(snapshot, config, actorId, guildId, expectedGuildId) {
  if (config?.enabled !== true || !/^[0-9]{17,20}$/.test(config.ownerId || '') || actorId !== config.ownerId ||
      !/^[0-9]{17,20}$/.test(expectedGuildId || '') || guildId !== expectedGuildId) {
    throw new Error('Owner authorization in the configured server required');
  }
  if (!isManualReviewSnapshot(snapshot)) throw new Error('Manual review responses unavailable');
  return snapshot.items.map(item => ({ ...item }));
}
const escape = value => value.replace(/[\\`*_~|<>@]/g, character => String.fromCharCode(92) + character);
export function ownerManualReviewEmbed(snapshot, config, actorId, guildId, expectedGuildId) {
  const items = ownerManualReviewItems(snapshot, config, actorId, guildId, expectedGuildId);
  return { title: 'Application responses — owner review', color: 0xf1c40f,
    description: 'Responses submitted, not automatically passed. Review these before a separate approval or denial.',
    fields: items.flatMap((item, index) => [
      { name: `Question ${index + 1}`, value: escape(item.question) },
      { name: `Learner response ${index + 1}`, value: escape(item.response) },
      { name: `Expected answer / guide ${index + 1}`, value: escape(item.expectedAnswer) }
    ]),
    footer: { text: 'Owner-only • Answer guide captured at submission • No access granted by inspection' } };
}

export function hasManualReviewAcknowledgment(record) {
  return Boolean(hasSubmittedManualReview(record) &&
    typeof record.discord_user_id === 'string' && /^[0-9]{17,20}$/.test(record.discord_user_id) &&
    record.signature_method === 'discord_account' && record.acknowledgment_name == null &&
    record.signature_reference == null && typeof record.agreement_version === 'string' &&
    record.agreement_version.length > 0 && record.agreement_version.length <= 100 &&
    typeof record.agreement_content_sha256 === 'string' && /^[a-f0-9]{64}$/.test(record.agreement_content_sha256) &&
    record.acknowledged_at && record.learner_confirmed_read_at && record.age_eligible === true &&
    record.age_declared_at && record.age_declaration_version === 'adult-18-v1');
}
