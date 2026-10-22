import { createInvitationInteractionHandler } from './certification-invitation-interactions.js';
import { createProvenanceInvitationReader } from './certification-registration-provenance.js';
import { createManualReviewSubmission } from './certification-manual-review-submission.mjs';
import { buildManualReviewModal, buildManualQuestionEmbed } from './certification-manual-review-presentation.mjs';

export function createManualReviewInvitationHandler(pool, config, guildId) {
  if (config?.manualReviewEnabled !== true) throw new Error('Explicit manual-review mode required');
  const questions = Object.freeze(config.comprehensionCheck.questions.map(q => Object.freeze({ prompt: q.prompt })));
  const presentationConfig = Object.freeze({ comprehensionCheck: { questions } });
  const handle = createInvitationInteractionHandler(pool, config, guildId, {
    createInvitationReader: createProvenanceInvitationReader,
    createSubmissionService: (connection, settings) => createManualReviewSubmission(connection, {
      ...settings, comprehensionCheck: { ...settings.comprehensionCheck, questions }
    }, { createInvitationReader: createProvenanceInvitationReader })
  });
  return async interaction => {
    const adapter = new Proxy(interaction, {
      get(target, property) {
        if (property === 'showModal') return payload => {
          const data = typeof payload?.toJSON === 'function' ? payload.toJSON() : payload;
          const token = /^cert:invite:send:([a-f0-9-]{36})$/.exec(data?.custom_id || '')?.[1];
          if (!token) throw new Error('Invalid manual-review form action');
          return target.showModal({ ...buildManualReviewModal(token, presentationConfig), custom_id: data.custom_id });
        };
        if (['reply', 'editReply'].includes(property)) return payload => {
          const reading = typeof payload?.content === 'string' && payload.content.startsWith('Agreement ') &&
            Array.isArray(payload.components) && payload.components.length > 0;
          return target[property](reading ? { ...payload, embeds: [buildManualQuestionEmbed(presentationConfig)] } : payload);
        };
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    return handle(adapter);
  };
}
