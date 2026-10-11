import { MODULE_ONE, MODULE_TWO } from './course-content.js';

export function moduleStatusLabel(progress) {
  if (progress?.completed_at !== null && progress?.completed_at !== undefined) {
    return '🏆 Complete';
  }
  if (Number(progress?.xp_earned ?? 0) > 0 ||
      progress?.lesson_completed || progress?.lab_completed || progress?.quiz_completed) {
    return '🟡 In progress';
  }
  return '⬜ Not started';
}

export function isModuleTwoUnlocked(moduleOneProgress) {
  return moduleOneProgress?.completed_at !== null &&
    moduleOneProgress?.completed_at !== undefined;
}

export function buildLinuxCourseOverview(moduleOneProgress, moduleTwoProgress) {
  const lines = [
    '## Linux Fundamentals', '',
    `### Module 01 — ${MODULE_ONE.title}`,
    `${moduleStatusLabel(moduleOneProgress)} · ${moduleOneProgress?.xp_earned ?? 0}/100 XP`, '',
    `### Module 02 — ${MODULE_TWO.title}`
  ];
  if (isModuleTwoUnlocked(moduleOneProgress)) {
    lines.push('✅ Unlocked',
      `${moduleStatusLabel(moduleTwoProgress)} · ${moduleTwoProgress?.xp_earned ?? 0}/100 XP`);
  } else {
    lines.push('🔒 Locked — Complete Module 01 first.');
  }
  return lines.join('\n');
}
