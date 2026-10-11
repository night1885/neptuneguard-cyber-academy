import assert from 'node:assert/strict';
import { COURSES } from './course-registry.js';
import { showAcademyCourse, handleAcademyButton } from './academy-handler.js';
import { buildLearnerReport } from './learner-report.js';

let checks = 0;
let key = '';
let locked = false;
let latest;
const now = new Date();
const pool = { async query(sql) {
  if (sql.includes('FROM learner_profiles')) return { rows: [{
    current_path_slug: key, total_xp: 2800, created_at: now, last_activity_at: now
  }] };
  if (sql.includes('FROM learner_module_progress')) {
    const course = COURSES.find(c => c.key === key);
    return { rows: locked ? [] : course.modules.map(m => ({ module_number: m.number,
      lesson_completed: true, lab_completed: true, quiz_completed: true,
      xp_earned: 100, quiz_score: 100, completed_at: now })) };
  }
  throw new Error('Unexpected SQL in read-only test: ' + sql);
}};
const interaction = {
  user: {id:'offline-test'}, customId: '',
  async editReply(payload) {
    assert.ok(typeof payload.content === 'string' && payload.content.length <= 2000, 'Invalid content length'); checks++;
    const rows = (payload.components ?? []).map(r => r.toJSON());
    assert.ok(rows.length <= 5, 'Too many action rows'); checks++;
    for(const row of rows) {
      assert.ok(row.components.length <= 5, 'Too many buttons'); checks++;
      for(const button of row.components) {
        assert.ok(button.label.length <= 80 && button.custom_id.length <= 100, 'Oversized button'); checks++;
      }
    }
    latest = {payload, rows};
  }
};
async function click(id) {
  interaction.customId=id;
  assert.equal(await handleAcademyButton(interaction,pool),true); checks++;
}
for(const course of COURSES) {
  key=course.key; locked=false;
  for(let page=0;page<Math.ceil(course.modules.length/5);page++) {
    await showAcademyCourse(interaction,pool,key,page);
    const wanted=course.modules.slice(page*5,page*5+5);
    for(const module of wanted) {
      const id=key==='linux-fundamentals' && module.number<=2 ? `linux-open-m${module.number}` : `academy:${key}:${module.number}:open`;
      assert.ok(latest.rows[0].components.some(b=>b.custom_id===id),'Module button missing or wrong route'); checks++;
    }
  }
  const report=await buildLearnerReport(pool,'offline-test');
  assert.ok(report.length<=2000 && report.includes(`${course.modules.length}/${course.modules.length} modules complete`),'Progress report wrong'); checks++;
  for(const module of course.modules) {
    if(key==='linux-fundamentals' && module.number===1) continue;
    const prefix=`academy:${key}:${module.number}:`;
    for(const action of ['open','hint','progress','quiz']) await click(prefix+action);
    for(const kind of ['lesson','lab']) {
      let page=0;
      while(true) {
        await click(prefix+`${kind}:${page}`);
        const buttons=latest.rows.flatMap(r=>r.components);
        const next=buttons.find(b=>b.label==='Next');
        if(!next) {
          assert.ok(buttons.some(b=>b.custom_id===prefix+`${kind}-complete`),'Missing final confirmation'); checks++; break;
        }
        page++;
        assert.ok(page<100,'Pagination loop');
      }
    }
    await click(prefix+'answer-invalid');
  }
  locked=true;
  await showAcademyCourse(interaction,pool,key);
  assert.ok(latest.rows[0].components[0].disabled===false,'First module unexpectedly locked');checks++;
  assert.ok(latest.rows[0].components.slice(1).every(b=>b.disabled),'Prerequisite buttons not disabled');checks++;
  await click(`academy:${key}:2:open`);
  assert.ok(latest.payload.content.includes('Complete Module 1 first.'),'Locked module not rejected');checks++;
}
key='unimplemented-path';
await showAcademyCourse(interaction,pool,key);
assert.ok(latest.payload.content.includes('not implemented'));checks++;
console.log(`PASS: ${checks} read-only UI/report checks across ${COURSES.length} courses.`);
console.log('No Discord login or live database access. Authorization wiring, SQL transactions, and concurrent clicks still require separate verification.');
