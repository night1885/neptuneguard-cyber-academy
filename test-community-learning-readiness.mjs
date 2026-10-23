import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyCommunityDatabase } from './community-learning-readiness.mjs';
function snapshot() {
  const columns = {
    learner_profiles: { discord_user_id: 'text', current_path_slug: 'text', created_at: 'timestamp with time zone', last_activity_at: 'timestamp with time zone', total_xp: 'integer' },
    learner_module_progress: { discord_user_id: 'text', course_key: 'text', module_number: 'integer', lesson_completed: 'boolean', lab_completed: 'boolean', quiz_completed: 'boolean', quiz_score: 'integer', xp_earned: 'integer', completed_at: 'timestamp with time zone' },
    learner_badges: { discord_user_id: 'text', badge_key: 'text', badge_name: 'text', earned_at: 'timestamp with time zone' }
  };
  const primary = { learner_profiles: ['discord_user_id'], learner_module_progress: ['discord_user_id','course_key','module_number'], learner_badges: ['discord_user_id','badge_key'] };
  return { database: 'academy', actor: 'academy_community_learning', login: 'academy_community_learning', search_path: 'pg_catalog,public,pg_temp',
    role: { login: true, super: false, create_role: false, create_db: false, replication: false, bypass: false, inherit: false },
    memberships: 0, database_create: false, writable_schemas: 0, outside_tables: 0, executable_definers: 0,
    tables: Object.keys(columns).map(name => ({ name, kind: 'r', rls: false, forced_rls: false, select: true, insert: true, update: name !== 'learner_badges', excess: false, triggers: 0, columns: columns[name], primary_key: primary[name] })) };
}
const pool = data => ({ async query(sql) { assert.ok(sql.startsWith('SELECT')); return { rows: [data] }; } });
test('exact dedicated identity and restricted schema reach readiness without writes', async () => {
  assert.deepEqual(await verifyCommunityDatabase(pool(snapshot()), 'academy'), { ready: true });
});
test('wrong database, login, search path, memberships and broader privileges fail closed', async () => {
  for (const mutate of [d => d.database = 'wrong', d => d.actor = 'owner', d => d.login = 'other', d => d.search_path = 'public',
    d => d.memberships = 1, d => d.role.inherit = true, d => d.role.super = true, d => d.database_create = true,
    d => d.writable_schemas = 1, d => d.outside_tables = 1, d => d.executable_definers = 1]) {
    const data = snapshot(); mutate(data); await assert.rejects(verifyCommunityDatabase(pool(data), 'academy'));
  }
});
test('missing table, unsafe triggers, wrong key, type drift and excess grants fail closed', async () => {
  for (const mutate of [d => d.tables.pop(), d => d.tables[0].triggers = 1, d => d.tables[0].primary_key = [],
    d => d.tables[0].columns.total_xp = 'text', d => d.tables[0].excess = true, d => d.tables[2].update = true, d => d.tables[0].rls = true]) {
    const data = snapshot(); mutate(data); await assert.rejects(verifyCommunityDatabase(pool(data), 'academy'));
  }
});
