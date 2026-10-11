import { getCourse } from './course-registry.js';
import { getCourseProgress, defaultProgress } from './module-progress.js';

export async function buildLearnerReport(pool, userId, title = 'Your NeptuneGuard Progress') {
  const result = await pool.query(`SELECT current_path_slug,total_xp,created_at,last_activity_at
    FROM learner_profiles WHERE discord_user_id=$1`, [userId]);
  const profile = result.rows[0];
  if (!profile) return 'No learner profile found. Use /start first.';
  const lines = [`## ${title}`, `Current path: ${profile.current_path_slug || 'Not selected'}`,
    `Total academy XP: ${profile.total_xp}`, ''];
  const course = getCourse(profile.current_path_slug);
  if (course) {
    const progress = await getCourseProgress(pool, userId, course.key);
    let earned = 0; let possible = 0; let completed = 0;
    for (const module of course.modules) {
      const p = progress.get(module.number) ?? defaultProgress();
      const max = module.lessonXp + module.labXp + module.quizXp;
      earned += Number(p.xp_earned); possible += max;
      if (p.completed_at) completed++;
      lines.push(`Module ${String(module.number).padStart(2,'0')}: ${p.completed_at ? 'Complete' : 'Not complete'} · ${p.xp_earned}/${max} XP`);
    }
    lines.push('', `Current course: ${completed}/${course.modules.length} modules complete · ${earned}/${possible} XP`);
  } else lines.push('Curriculum for this path is not implemented yet.');
  for (const [label, value] of [['Started',profile.created_at],['Last activity',profile.last_activity_at]]) {
    const time = new Date(value).getTime();
    if (value && Number.isFinite(time)) lines.push(`${label}: <t:${Math.floor(time/1000)}:R>`);
  }
  const text=lines.join('\n');
  if(text.length>2000) throw new Error('Progress report exceeds message limit');
  return text;
}
