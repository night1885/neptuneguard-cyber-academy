// Static study guidance only: no learner inputs, storage, clocks or network dependencies.
export function formalStudyGuidance(page) {
  if (page === 1) return [
    'Study workflow — no activity is saved by this view.',
    '1. Review the suggested prior reading and read the complete lesson before acting.',
    '2. Explain the main idea in your own words and predict the supplied example result before comparing it with the explanation.',
    '3. Identify whether the exercise is paper-only, an offline fixture or an authorized isolated-lab task. Follow only the original instructions. This page activates no practical and grants no permission.',
    '4. Keep expected results separate from observations. If setup, permission or a result is unclear, stop rather than widen the task.',
    '5. Compare your reasoning with the lesson’s explained answers and limitations, then use Self-review.',
    'Do not send answers, files, screenshots or practical evidence to this view. It has no submission or grading function.'
  ].join('\n\n');
  if (page === 2) return [
    'Self-review — reflect privately; no response or score is collected by this view.',
    'Can I explain the main idea and why the supplied answer follows?',
    'Can I distinguish a prediction, an observation, an interpretation and something not executed?',
    'Can I identify the exact exercise boundary, stop conditions and cleanup in the original lesson?',
    'Can I name a conclusion the supplied evidence does not support?',
    'If AI critique is permitted in the lesson, can I reject invented results or broader actions? Manual self-review is sufficient.',
    'If an explanation is unclear, return to the lesson. Opening this page does not record progress, assess mastery, complete the course or issue a certificate.',
    'Enrollment and course-access records remain in use. No stored study history is added. This is not a claim that Discord or infrastructure providers retain no metadata.'
  ].join('\n\n');
  throw new Error('Invalid study guidance page');
}
