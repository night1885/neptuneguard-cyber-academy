import {
  MODULE_ONE,
  MODULE_TWO
} from './course-content.js';

export function moduleStatusLabel(progress) {
  return progress?.completed_at
    ? '🏆 Complete'
    : '⬜ Not started';
}

export function buildLinuxCourseOverview(
  moduleOneProgress,
  moduleTwoProgress
) {
  const moduleOneComplete =
    moduleOneProgress?.completed_at !== null &&
    moduleOneProgress?.completed_at !== undefined;

  const moduleTwoUnlocked = moduleOneComplete;

  const lines = [
    '## Linux Fundamentals',
    '',
    `### Module 01 — ${MODULE_ONE.title}`,
    `${moduleStatusLabel(moduleOneProgress)} · ${moduleOneProgress?.xp_earned || 0}/100 XP`,
    '',
    `### Module 02 — ${MODULE_TWO.title}`
  ];

  if (moduleTwoUnlocked) {
    lines.push('✅ Unlocked — Ready to begin.');
    lines.push(
      `Progress: ${moduleTwoProgress?.xp_earned || 0}/100 XP`
    );
  } else {
    lines.push('🔒 Locked — Complete Module 01 first.');
  }

  return lines.join('\n');
}

export function isModuleTwoUnlocked(moduleOneProgress) {
  return (
    moduleOneProgress?.completed_at !== null &&
    moduleOneProgress?.completed_at !== undefined
  );
}