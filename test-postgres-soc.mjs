import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { getModule } from './course-registry.js';
import { completeActivity } from './module-progress.js';

if (!process.argv.includes('--isolated-schema')) {
  console.error('Not run. Use --isolated-schema to authorize temporary schema creation and removal.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Do not print it.');
const schema = `ng_engine_test_${randomBytes(8).toString('hex')}`;
const settings = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.RENDER === 'true' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 15000,
  max: 12
};
const admin = new Pool({...settings, max: 1});
let testPool; let created = false; let failed = false;
try {
  await admin.query(`CREATE SCHEMA ${schema}`); created = true;
  for (const table of ['learner_profiles','learner_module_progress','learner_badges']) {
    await admin.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  }
  testPool = new Pool({...settings, options: `-c search_path=${schema}`});
  const path = await testPool.query('SELECT current_schema() AS schema');
  assert.equal(path.rows[0].schema, schema);
  const user = 'isolated-test-learner';
  const module = getModule('soc-analyst',3);
  assert.ok(module);
  await assert.rejects(()=>completeActivity(testPool,user,module,'lesson_completed'),
    error=>error.code==='MODULE_LOCKED');
  let rows=await testPool.query('SELECT * FROM learner_profiles');
  assert.equal(rows.rowCount,0,'Blocked award did not roll back profile insert');
  await testPool.query(`INSERT INTO learner_module_progress
    (discord_user_id,course_key,module_number,lesson_completed,lab_completed,quiz_completed,xp_earned,completed_at)
    VALUES ($1,$2,2,TRUE,TRUE,TRUE,100,NOW())`,[user,module.courseKey]);
  const first=await Promise.all(Array.from({length:10},()=>completeActivity(testPool,user,module,'lesson_completed')));
  assert.equal(first.filter(r=>r.completedNow).length,1);
  assert.equal(first.reduce((sum,r)=>sum+r.xp,0),25);
  await Promise.all(Array.from({length:10},(_,i)=>completeActivity(testPool,user,module,i%2?'lab_completed':'quiz_completed')));
  const profile=await testPool.query('SELECT total_xp FROM learner_profiles WHERE discord_user_id=$1',[user]);
  assert.equal(profile.rows[0].total_xp,100);
  const progress=await testPool.query(`SELECT * FROM learner_module_progress
    WHERE discord_user_id=$1 AND course_key=$2 AND module_number=3`,[user,module.courseKey]);
  assert.equal(progress.rows[0].xp_earned,100);
  assert.ok(progress.rows[0].completed_at);
  assert.equal(progress.rows[0].quiz_score,100);
  const badges=await testPool.query('SELECT * FROM learner_badges WHERE discord_user_id=$1',[user]);
  assert.equal(badges.rowCount,1);
  // Force an update failure inside an award to prove transaction rollback.
  await testPool.query('ALTER TABLE learner_profiles ADD CONSTRAINT test_xp_limit CHECK (total_xp <= 100)');
  const next=getModule(module.courseKey,4);
  await assert.rejects(()=>completeActivity(testPool,user,next,'lesson_completed'),error=>error.code==='23514');
  const rolledBack=await testPool.query('SELECT * FROM learner_module_progress WHERE module_number=4');
  assert.equal(rolledBack.rowCount,0);
  const unchanged=await testPool.query('SELECT total_xp FROM learner_profiles WHERE discord_user_id=$1',[user]);
  assert.equal(unchanged.rows[0].total_xp,100);
  console.log('PASS: SOC live PostgreSQL prerequisite rollback, concurrent duplicate awards, completion badge, and forced-failure rollback.');
  console.log('Tests used empty cloned tables in a dedicated temporary schema, not real learner rows.');
} catch(error) {
  failed=true;
  console.error('Database test failed:', {name:error.name,code:error.code ?? 'TEST_FAILURE'});
  if(error.name==='AssertionError') console.error('Assertion:',error.message);
  console.error('Do not share DATABASE_URL or full connection error objects.');
} finally {
  if(testPool) await testPool.end();
  if(created) {
    try {
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      console.log('Temporary test schema removed.');
    } catch(error) {
      failed=true;
      console.error('Cleanup failed. Temporary schema retained:',schema,'Error code:',error.code);
    }
  }
  await admin.end();
}
if(failed) process.exitCode=1;
