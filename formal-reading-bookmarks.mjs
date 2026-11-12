// Durable reading positions only. No runtime entry point or completion/award operation.
const id = x => typeof x === 'string' && /^[0-9]{17,20}$/.test(x);
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const lesson = x => typeof x === 'string' && /^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(x);
const maxVersion = 2147483646;
const unavailable = () => Object.freeze({status:'unavailable',recovery:'reload-before-retrying-a-save'});
function data(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new Error('Invalid data');
  const names = Reflect.ownKeys(value);
  if (names.length !== keys.length || keys.some(k => !names.includes(k))) throw new Error('Invalid fields');
  const copy = {};
  for (const key of keys) {
    const field = Object.getOwnPropertyDescriptor(value,key);
    if (!field || !Object.hasOwn(field,'value')) throw new Error('Accessor refused');
    copy[key] = field.value;
  }
  return copy;
}
export function createFormalReadingBookmarks({enabled=false,pool,authorizeTransaction,packages,now=()=>new Date()}={}) {
  let stopped = enabled !== true;
  if (stopped) return Object.freeze({load:async()=>unavailable(),save:async()=>unavailable(),dispose(){}});
  if (typeof pool?.connect !== 'function' || typeof authorizeTransaction !== 'function' || typeof now !== 'function' || !Array.isArray(packages) || packages.length < 1 || packages.length > 2) throw new Error('Reviewed bookmark dependencies required');
  const publications = new Map();
  for (const raw of packages) {
    const p = data(raw,['courseKey','revision','pages']);
    if (!['ethical-hacking','incident-response'].includes(p.courseKey) || publications.has(p.courseKey) || !digest(p.revision) || !p.pages || typeof p.pages !== 'object' || Array.isArray(p.pages) || ![Object.prototype,null].includes(Object.getPrototypeOf(p.pages))) throw new Error('Invalid student package metadata');
    const names = Reflect.ownKeys(p.pages);
    if (!names.length || names.length > 200 || names.some(k=>!lesson(k))) throw new Error('Invalid page allowlist');
    const pages = data(p.pages,names);
    if (Object.values(pages).some(n=>!Number.isSafeInteger(n)||n<1||n>10000)) throw new Error('Invalid page bounds');
    publications.set(p.courseKey,Object.freeze({revision:p.revision,pages:Object.freeze(pages)}));
  }
  const view = (row,revision,duplicate=false) => Object.freeze({status:'saved',revision,lessonKey:row.lesson_key,pageIndex:row.page_index,version:row.version,duplicate});
  async function perform(raw,writing) {
    let db,discard=false,committing=false;
    try {
      const input = data(raw,writing?['actorId','courseKey','revision','lessonKey','pageIndex','expectedVersion']:['actorId','courseKey']);
      const p = publications.get(input.courseKey);
      if (stopped || !id(input.actorId) || !p) return unavailable();
      if (writing && (input.revision!==p.revision || !lesson(input.lessonKey) || !Object.hasOwn(p.pages,input.lessonKey) || !Number.isSafeInteger(input.pageIndex) || input.pageIndex<0 || input.pageIndex>=p.pages[input.lessonKey] || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion<0 || input.expectedVersion>=maxVersion)) return unavailable();
      db = await pool.connect();
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout = '2s'");
      await db.query("SET LOCAL statement_timeout = '3s'");
      const parent = await db.query('SELECT discord_user_id FROM certification_enrollments WHERE discord_user_id=$1 FOR UPDATE',[input.actorId]);
      const assigned = await db.query('SELECT course_key FROM certification_course_enrollments WHERE discord_user_id=$1 AND course_key=$2 FOR UPDATE',[input.actorId,input.courseKey]);
      if (stopped || parent.rows.length!==1 || assigned.rows.length!==1) throw new Error('Unavailable');
      const auth = await authorizeTransaction(db,Object.freeze({actorId:input.actorId,courseKey:input.courseKey}));
      if (auth?.course_key!==input.courseKey || typeof auth.student_id!=='string' || !auth.student_id.trim() || auth.student_id.length>100 || stopped) throw new Error('Unavailable');
      const prior = await db.query('SELECT student_id,revision,lesson_key,page_index,version,updated_at FROM formal_reading_bookmarks WHERE discord_user_id=$1 AND course_key=$2 FOR UPDATE',[input.actorId,input.courseKey]);
      if (prior.rows.length>1) throw new Error('Invalid stored state');
      const row = prior.rows[0];
      if (row && (row.student_id!==auth.student_id || !digest(row.revision) || !lesson(row.lesson_key) || !Number.isSafeInteger(row.page_index) || row.page_index<0 || row.page_index>9999 || !Number.isSafeInteger(row.version) || row.version<1 || row.version>maxVersion || (!((row.updated_at instanceof Date)||typeof row.updated_at==='string') || !Number.isFinite(new Date(row.updated_at).getTime())))) throw new Error('Invalid stored state');
      let result;
      if (!writing) {
        if (!row) result = Object.freeze({status:'empty',revision:p.revision,version:0});
        else if (row.revision!==p.revision) result = Object.freeze({status:'revision_changed',revision:p.revision,version:row.version});
        else if (!Object.hasOwn(p.pages,row.lesson_key) || row.page_index>=p.pages[row.lesson_key]) throw new Error('Invalid stored cursor');
        else result = view(row,p.revision);
      } else if (row && row.version===input.expectedVersion+1 && row.revision===p.revision && row.lesson_key===input.lessonKey && row.page_index===input.pageIndex) {
        result = view(row,p.revision,true);
      } else if ((row?.version ?? 0)!==input.expectedVersion) {
        result = Object.freeze({status:'conflict',recovery:'reload-before-retrying-a-save'});
      } else {
        const time = now();
        if (!(time instanceof Date) || !Number.isFinite(time.getTime()) || time.getUTCFullYear()<1970 || time.getUTCFullYear()>9998 || row && time.getTime()<new Date(row.updated_at).getTime()) throw new Error('Invalid server time');
        const values = [input.actorId,input.courseKey,auth.student_id,p.revision,input.lessonKey,input.pageIndex,input.expectedVersion+1,time.toISOString()];
        const changed = row ? await db.query('UPDATE formal_reading_bookmarks SET revision=$4,lesson_key=$5,page_index=$6,version=$7,updated_at=$8 WHERE discord_user_id=$1 AND course_key=$2 AND student_id=$3 AND version=$9 RETURNING student_id,revision,lesson_key,page_index,version,updated_at',[...values,input.expectedVersion]) : await db.query('INSERT INTO formal_reading_bookmarks (discord_user_id,course_key,student_id,revision,lesson_key,page_index,version,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING student_id,revision,lesson_key,page_index,version,updated_at',values);
        if (changed.rowCount!==1 || changed.rows.length!==1 || changed.rows[0].student_id!==auth.student_id || changed.rows[0].revision!==p.revision || changed.rows[0].lesson_key!==input.lessonKey || changed.rows[0].page_index!==input.pageIndex || changed.rows[0].version!==input.expectedVersion+1 || new Date(changed.rows[0].updated_at).getTime()!==time.getTime()) throw new Error('Save not confirmed');
        result = view(changed.rows[0],p.revision);
      }
      if (stopped) throw new Error('Stopped');
      committing = true;
      await db.query('COMMIT');
      return result;
    } catch {
      if (committing) discard=true;
      if (db) try { await db.query('ROLLBACK'); } catch { discard=true; }
      return unavailable();
    } finally { if(db) db.release(discard); }
  }
  return Object.freeze({load:input=>perform(input,false),save:input=>perform(input,true),dispose(){stopped=true;}});
}
