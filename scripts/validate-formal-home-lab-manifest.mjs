import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function validate(m) {
  const errors = [], text = x => typeof x === 'string' && x.trim().length > 0;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['Manifest object required'];
  if (m.schemaVersion !== 1 || m.courseKey !== 'ethical-hacking' || m.status !== 'draft-not-published') errors.push('Draft formal-course identity required');
  if (m.runtimeIntegration !== false || m.communityLearningChanges !== false) errors.push('Runtime/community changes forbidden');
  if (m.navigation?.learnerSlashCommands !== false || m.navigation?.modalNavigation !== false || m.navigation?.inPlace !== true) errors.push('Navigation contract violated');
  if (!Array.isArray(m.releaseBlockers) || !m.releaseBlockers.length || !m.releaseBlockers.every(text) || !text(m.authorizationRule)) errors.push('Release blockers and authorization rule required');
  if (!Array.isArray(m.lessons) || !m.lessons.length) return [...errors, 'Lessons required'];
  const lessons = new Map();
  for (const l of m.lessons) {
    if (!l || !/^EH-LAB-[0-9]{2}$/.test(l.id ?? '') || typeof l.id !== 'string') { errors.push('Invalid lesson ID'); continue; }
    if (lessons.has(l.id)) errors.push('Duplicate lesson ID');
    lessons.set(l.id, l);
    if (!text(l.title) || !text(l.status) || l.publishable !== false || !Array.isArray(l.acceptance) || !l.acceptance.length || !l.acceptance.every(text)) errors.push('Incomplete or publishable draft lesson');
    if (!Array.isArray(l.requires) || !l.requires.every(text) || new Set(l.requires).size !== l.requires.length) errors.push('Invalid prerequisites');
  }
  const active = new Set(), done = new Set();
  function visit(id) {
    if (active.has(id)) { errors.push('Dependency cycle'); return; }
    if (done.has(id)) return;
    active.add(id);
    const deps = lessons.get(id)?.requires;
    if (Array.isArray(deps)) for (const dep of deps) {
      if (!lessons.has(dep)) errors.push('Unknown prerequisite'); else visit(dep);
    }
    active.delete(id); done.add(id);
  }
  for (const id of lessons.keys()) visit(id);
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Path required');
    const errors = validate(JSON.parse(readFileSync(process.argv[2], 'utf8')));
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('DRAFT_STRUCTURE_PASS: not release approval');
  } catch { console.error('Provide a readable JSON manifest path'); process.exitCode = 2; }
}
