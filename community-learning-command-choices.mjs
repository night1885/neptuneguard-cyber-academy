import { COMMUNITY_COURSES } from './community-learning-policy.mjs';
const titles = Object.freeze({ 'linux-fundamentals': 'Linux Fundamentals', 'linux-administration': 'Linux Administration', 'linux-security-engineering': 'Linux Security Engineering' });
export function communityLearningPathChoices() {
  return COMMUNITY_COURSES.map(value => ({ name: titles[value], value }));
}
export function assertKnownGuildCommandScope(existing, definitions) {
  const names = new Set(definitions.map(command => command.name));
  if (!Array.isArray(existing) || existing.some(command => command.type !== 1 || !names.has(command.name))) throw new Error('Refusing to overwrite unrelated guild commands');
  return true;
}
