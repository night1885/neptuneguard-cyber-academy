import test from 'node:test';
import assert from 'node:assert/strict';
import {createFormalReadingBookmarks} from './formal-reading-bookmarks.mjs';
const actorId='11111111111111111',other='22222222222222222',courseKey='ethical-hacking',revision='a'.repeat(64);
const packages=[{courseKey,revision,pages:{'EH-LAB-00':2,'EH-LAB-01':1}},{courseKey:'incident-response',revision,pages:{'IR-READING':1}}];
function setup() {
  const rows=new Map(),calls=[],releases=[];let allowed=true,fail=null,clock=new Date('2030-01-01T00:00:00Z');
  const db={async query(sql,values=[]){calls.push({sql,values});if(fail&&sql.startsWith(fail))throw new Error('test failure');
    if(sql.startsWith('SELECT discord_user_id'))return{rows:[{}]};
    if(sql.startsWith('SELECT course_key'))return{rows:[{}]};
    const key=JSON.stringify(values.slice(0,2));
    if(sql.startsWith('SELECT student_id'))return{rows:rows.has(key)?[{...rows.get(key)}]:[]};
    if(sql.startsWith('INSERT INTO formal_reading_bookmarks')||sql.startsWith('UPDATE formal_reading_bookmarks')){
      const row={student_id:values[2],revision:values[3],lesson_key:values[4],page_index:values[5],version:values[6],updated_at:values[7]};rows.set(key,row);return{rowCount:1,rows:[{...row}]};}
    return{rows:[]};},release(value){releases.push(value);}};
  const pool={async connect(){return db;}};
  const metadata=structuredClone(packages);
  const authorizeTransaction=async(_db,ctx)=>{calls.push({sql:'AUTHORIZE',values:[ctx.actorId,ctx.courseKey]});return allowed?{student_id:'SYNTHETIC-STUDENT',course_key:ctx.courseKey}:null;};
  const service=createFormalReadingBookmarks({enabled:true,pool,packages:metadata,authorizeTransaction,now:()=>clock});
  return{service,pool,rows,calls,releases,metadata,authorizeTransaction,setAllowed:x=>allowed=x,setFail:x=>fail=x,setClock:x=>clock=x};
}
const load={actorId,courseKey};
const save={actorId,courseKey,revision,lessonKey:'EH-LAB-00',pageIndex:0,expectedVersion:0};
test('disabled is side-effect free',async()=>{const s=createFormalReadingBookmarks();assert.equal((await s.load(load)).status,'unavailable');assert.equal((await s.save(save)).status,'unavailable');});
test('fresh location is empty, not complete',async()=>{const x=setup();assert.deepEqual(await x.service.load(load),{status:'empty',revision,version:0});});
test('save and load selected cursor',async()=>{const x=setup();assert.equal((await x.service.save(save)).version,1);const r=await x.service.load(load);assert.equal(r.lessonKey,'EH-LAB-00');assert.equal(r.pageIndex,0);assert.equal(Object.hasOwn(r,'student_id'),false);});
test('exact repeated save is idempotent',async()=>{const x=setup();await x.service.save(save);assert.equal((await x.service.save(save)).duplicate,true);assert.equal(x.calls.filter(x=>x.sql.startsWith('INSERT')).length,1);});
test('stale competing position conflicts',async()=>{const x=setup();await x.service.save(save);assert.equal((await x.service.save({...save,pageIndex:1})).status,'conflict');});
test('next version can save a different known cursor',async()=>{const x=setup();await x.service.save(save);assert.equal((await x.service.save({...save,lessonKey:'EH-LAB-01',expectedVersion:1})).version,2);});
test('revocation prevents reads and writes',async()=>{const x=setup();await x.service.save(save);x.setAllowed(false);assert.equal((await x.service.load(load)).status,'unavailable');assert.equal((await x.service.save({...save,expectedVersion:1})).status,'unavailable');assert.equal(x.calls.filter(x=>x.sql.startsWith('UPDATE')).length,0);});
test('another actor does not receive the first cursor',async()=>{const x=setup();await x.service.save(save);assert.equal((await x.service.load({...load,actorId:other})).status,'empty');});
test('wrong course authorization is rejected',async()=>{const x=setup();const s=createFormalReadingBookmarks({enabled:true,pool:x.pool,packages,authorizeTransaction:async()=>({student_id:'SYNTHETIC-STUDENT',course_key:'incident-response'})});assert.equal((await s.load(load)).status,'unavailable');});
test('old publication is not automatically resumed',async()=>{const x=setup();await x.service.save(save);x.rows.values().next().value.revision='b'.repeat(64);const r=await x.service.load(load);assert.equal(r.status,'revision_changed');assert.equal(Object.hasOwn(r,'lessonKey'),false);});
test('identity reissue cannot expose old bookmark',async()=>{const x=setup();await x.service.save(save);x.rows.values().next().value.student_id='OLD-STUDENT';assert.equal((await x.service.load(load)).status,'unavailable');});
test('invalid input rejected before database access',async()=>{for(const patch of [{actorId:1},{courseKey:'linux-fundamentals'},{revision:'b'.repeat(64)},{lessonKey:'../private'},{lessonKey:'UNKNOWN'},{pageIndex:true},{pageIndex:-1},{pageIndex:2},{expectedVersion:true},{expectedVersion:-1},{expectedVersion:2147483646},{extra:1}]){const x=setup();assert.equal((await x.service.save({...save,...patch})).status,'unavailable');assert.equal(x.calls.length,0);}});
test('accessors are not evaluated',async()=>{const x=setup();let touched=false;const input={...save};Object.defineProperty(input,'actorId',{get(){touched=true;return actorId;},enumerable:true});assert.equal((await x.service.save(input)).status,'unavailable');assert.equal(touched,false);});
test('metadata copied instead of caller-mutated',async()=>{const x=setup();x.metadata[0].revision='b'.repeat(64);delete x.metadata[0].pages['EH-LAB-00'];assert.equal((await x.service.save(save)).status,'saved');});
test('locks precede authorization and position access',async()=>{const x=setup();await x.service.load(load);const names=x.calls.map(x=>x.sql);assert.ok(names.findIndex(x=>x.startsWith('SELECT discord_user_id'))<names.findIndex(x=>x.startsWith('SELECT student_id')));assert.ok(names.indexOf('AUTHORIZE')>names.findIndex(x=>x.startsWith('SELECT course_key')));assert.ok(names.indexOf('AUTHORIZE')<names.findIndex(x=>x.startsWith('SELECT student_id')));assert.ok(names.includes('COMMIT'));});
test('query errors roll back and reveal no raw database error',async()=>{const x=setup();x.setFail('SELECT student_id');assert.deepEqual(await x.service.load(load),{status:'unavailable',recovery:'reload-before-retrying-a-save'});assert.ok(x.calls.some(x=>x.sql==='ROLLBACK'));});
test('unknown commit outcome discards connection and never retries save',async()=>{const x=setup();x.setFail('COMMIT');assert.equal((await x.service.save(save)).status,'unavailable');assert.equal(x.releases.at(-1),true);assert.equal(x.calls.filter(x=>x.sql.startsWith('INSERT')).length,1);});
test('clock rollback prevents further update',async()=>{const x=setup();await x.service.save(save);x.setClock(new Date('2029-01-01T00:00:00Z'));assert.equal((await x.service.save({...save,pageIndex:1,expectedVersion:1})).status,'unavailable');assert.equal(x.calls.filter(x=>x.sql.startsWith('UPDATE')).length,0);});
test('dispose denies subsequent operations',async()=>{const x=setup();x.service.dispose();assert.equal((await x.service.load(load)).status,'unavailable');assert.equal(x.calls.length,0);});
test('constructor rejects invalid dependency and publication bounds',()=>{for(const patch of [{pool:{}},{authorizeTransaction:null},{packages:[]},{packages:[{...packages[0],revision:'bad'}]},{packages:[{...packages[0],pages:{'EH-LAB-00':true}}]}]){const x=setup();assert.throws(()=>createFormalReadingBookmarks({enabled:true,pool:x.pool,authorizeTransaction:x.authorizeTransaction,packages,...patch}));}});
test('incident response position is separate from EH',async()=>{const x=setup();await x.service.save(save);assert.equal((await x.service.load({...load,courseKey:'incident-response'})).status,'empty');assert.equal((await x.service.save({...save,courseKey:'incident-response',lessonKey:'IR-READING'})).status,'saved');assert.equal(x.rows.size,2);});
