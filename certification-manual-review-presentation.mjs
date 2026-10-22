export function buildManualReviewModal(token, config) {
  if (typeof token !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(token)) throw new Error('Invalid enrollment session');
  const questions = config?.comprehensionCheck?.questions;
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 3 ||
      questions.some(q => typeof q?.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > 300)) throw new Error('Invalid comprehension questions');
  const field = (id, label, description, max, style = 1) => ({ type: 18, label, description,
    component: { type: 4, custom_id: id, style, required: true, max_length: max } });
  return { custom_id: `cert:submit:send:${token}`, title: 'Request enrollment review', components: [
    field('age', 'Are you 18 years of age or older?', 'Type Yes or No. This is your own age-eligibility declaration.', 3),
    field('read', 'Agreement acknowledgment', 'Type AGREE only if you have read and agree to the agreement.', 5),
    ...questions.map((question, index) => field(`answer${index}`,
      question.prompt.length <= 45 ? question.prompt : `Comprehension question ${index + 1}`,
      question.prompt, 100, 2))
  ] };
}
export function buildManualQuestionEmbed(config) {
  const questions = config?.comprehensionCheck?.questions;
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 3 ||
      questions.some(q => typeof q?.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > 300)) throw new Error('Invalid comprehension questions');
  return { title: 'Questions for your application', color: 0xf1c40f,
    description: 'Answer each question in your own words. Your responses are submitted for administrator review; they are not automatically graded.',
    fields: questions.map((question, index) => ({ name: `Question ${index + 1}`, value: question.prompt })),
    footer: { text: 'Submission requests review only. Approval and access changes are separate.' } };
}
