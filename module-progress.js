// Shared persistence layer; does not start a bot or alter the schema.
export const defaultProgress = () => ({
  lesson_completed: false, lab_completed: false, quiz_completed: false,
  quiz_score: 0, xp_earned: 0, completed_at: null
});

export async function getCourseProgress(pool, userId, courseKey) {
  const { rows } = await pool.query(
    'SELECT * FROM learner_module_progress WHERE discord_user_id=$1 AND course_key=$2 ORDER BY module_number',
    [userId, courseKey]);
  return new Map(rows.map(p => [p.module_number, p]));
}

export function isModuleUnlocked(module, progress) {
  return module.prerequisiteModuleNumber == null ||
    Boolean(progress.get(module.prerequisiteModuleNumber)?.completed_at);
}

export async function completeActivity(pool, userId, module, activity) {
  const rewards = {
    lesson_completed: module.lessonXp,
    lab_completed: module.labXp,
    quiz_completed: module.quizXp
  };
  if (!Object.hasOwn(rewards, activity)) throw new Error('Invalid activity');
  const xp = rewards[activity];
  if (!Number.isInteger(xp) || xp < 0) throw new Error('Invalid XP definition');
  if (!module.courseKey || !Number.isInteger(module.number) || !module.badgeKey || !module.badgeName)
    throw new Error('Invalid module definition');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query(`INSERT INTO learner_profiles (discord_user_id)
      VALUES ($1) ON CONFLICT (discord_user_id) DO NOTHING`, [userId]);
    // Serialize awards for this learner, including awards across modules.
    await db.query('SELECT discord_user_id FROM learner_profiles WHERE discord_user_id=$1 FOR UPDATE', [userId]);
    if (module.prerequisiteModuleNumber != null) {
      const prerequisite = await db.query(`SELECT completed_at FROM learner_module_progress
        WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3 FOR SHARE`,
        [userId, module.courseKey, module.prerequisiteModuleNumber]);
      if (!prerequisite.rows[0]?.completed_at) {
        const error = new Error(`Complete Module ${module.prerequisiteModuleNumber} first.`);
        error.code = 'MODULE_LOCKED';
        throw error;
      }
    }
    await db.query(`INSERT INTO learner_module_progress
      (discord_user_id,course_key,module_number) VALUES ($1,$2,$3)
      ON CONFLICT (discord_user_id,course_key,module_number) DO NOTHING`,
      [userId,module.courseKey,module.number]);
    const previous = await db.query(`SELECT * FROM learner_module_progress
      WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3 FOR UPDATE`,
      [userId,module.courseKey,module.number]);
    const completedNow = !previous.rows[0][activity];
    let moduleCompletedNow = false;
    let progress = previous.rows[0];
    if (completedNow) {
      const updated = await db.query(`UPDATE learner_module_progress
        SET ${activity}=TRUE, xp_earned=xp_earned+$4,
        quiz_score=CASE WHEN $5 THEN 100 ELSE quiz_score END
        WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3 RETURNING *`,
        [userId,module.courseKey,module.number,xp,activity==='quiz_completed']);
      progress = updated.rows[0];
      if (progress.lesson_completed && progress.lab_completed && progress.quiz_completed && !progress.completed_at) {
        const finished = await db.query(`UPDATE learner_module_progress SET completed_at=NOW()
          WHERE discord_user_id=$1 AND course_key=$2 AND module_number=$3 RETURNING *`,
          [userId,module.courseKey,module.number]);
        progress = finished.rows[0];
        await db.query(`INSERT INTO learner_badges (discord_user_id,badge_key,badge_name)
          VALUES ($1,$2,$3) ON CONFLICT (discord_user_id,badge_key) DO NOTHING`,
          [userId,module.badgeKey,module.badgeName]);
        moduleCompletedNow = true;
      }
      await db.query(`UPDATE learner_profiles SET total_xp=total_xp+$2,last_activity_at=NOW()
        WHERE discord_user_id=$1`, [userId,xp]);
    } else {
      await db.query('UPDATE learner_profiles SET last_activity_at=NOW() WHERE discord_user_id=$1', [userId]);
    }
    await db.query('COMMIT');
    return { completedNow, moduleCompletedNow, xp: completedNow ? xp : 0, progress };
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
