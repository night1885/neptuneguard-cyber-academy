import { createManualReviewSnapshot, ownerManualReviewEmbed } from './certification-manual-review-data.mjs';

export function ownerCurrentQuestionGuide(config, actorId, guildId, expectedGuildId) {
  if (config?.enabled !== true || typeof config.ownerId !== 'string' ||
      !/^[0-9]{17,20}$/.test(config.ownerId) || actorId !== config.ownerId ||
      typeof expectedGuildId !== 'string' || !/^[0-9]{17,20}$/.test(expectedGuildId) || guildId !== expectedGuildId) {
    throw new Error('Owner authorization in the configured server required');
  }
  const snapshot = createManualReviewSnapshot(config, config.comprehensionCheck?.correctAnswers);
  const embed = ownerManualReviewEmbed(snapshot, config, actorId, guildId, expectedGuildId);
  return { ...embed, title: 'Current comprehension answer guide',
    description: 'Configured questions and expected answers for your private review. This is the current guide, not a learner submission. Submitted applications retain their own captured guide.',
    fields: embed.fields.filter((field, index) => index % 3 !== 1),
    footer: { text: 'Owner-only • Do not publish the answer guide • Inspection does not approve enrollment' } };
}
