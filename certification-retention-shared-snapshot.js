import {createHash} from 'node:crypto';
const discordId=v=>typeof v==='string'&&/^[0-9]{17,20}$/.test(v);
const identifier=v=>typeof v==='string'&&/^[a-z_][a-z0-9_]{0,62}$/.test(v);
const courseKey=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(v);
function utc(value,{millisecondsOnly=false}={}){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value))throw new Error('Exact canonical UTC timestamp required');
  const base=value.slice(0,23)+'Z',parsed=new Date(base);
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString()!==base||parsed.getUTCFullYear()<1970||parsed.getUTCFullYear()>9998||
    (millisecondsOnly&&!value.endsWith('000Z')))throw new Error('Unsupported or imprecise timestamp');
  return parsed;
}
// Pure evidence binding only. It neither queries records nor authorizes deletion.
export function buildSharedCompletionSnapshot({database,schema,subjectId,enrollment,courses,labCount,unreviewedDependencies,asOf}={}){
  if(!identifier(database)||!identifier(schema)||!discordId(subjectId)||!(asOf instanceof Date)||!Number.isFinite(asOf.getTime())||
    asOf.getUTCFullYear()<1970||asOf.getUTCFullYear()>9998)throw new Error('Explicit target, subject and as-of Date required');
  if(labCount!==0||!Array.isArray(unreviewedDependencies)||unreviewedDependencies.length!==0)throw new Error('Dependency review blocks shared deletion evidence');
  const e=enrollment;
  if(!e||e.discord_user_id!==subjectId||!['approved','suspended','revoked'].includes(e.status)||typeof e.student_id!=='string'||
    !e.student_id.trim()||e.student_id.length>100||!discordId(e.approved_by)||!['application_closed_at','application_closed_by','application_closed_as'].every(k=>Object.hasOwn(e,k)&&e[k]===null))throw new Error('Prior approved open enrollment required');
  const approved=utc(e.approved_at_utc);
  const cutoff=asOf.toISOString().replace('Z','000Z');
  if(approved>asOf||e.approved_at_utc>cutoff)throw new Error('Future approval evidence');
  if(!Array.isArray(courses)||courses.length<1||courses.length>50)throw new Error('Explicit bounded nonempty course set required');
  const seen=new Set();
  const rows=courses.map(c=>{
    if(!c||c.discord_user_id!==subjectId||!courseKey(c.course_key)||seen.has(c.course_key)||c.status!=='completed'||
      !discordId(c.assigned_by)||!discordId(c.completed_by))throw new Error('Every unique course needs recorded administrative completion');
    seen.add(c.course_key);
    const assigned=utc(c.assigned_at_utc,{millisecondsOnly:true}),completed=utc(c.completed_at_utc,{millisecondsOnly:true});
    if(completed<assigned||completed>asOf)throw new Error('Invalid completion chronology');
    return[c.course_key,c.status,c.assigned_at_utc,c.assigned_by,c.completed_at_utc,c.completed_by];
  }).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  const latestCompletedAt=rows.reduce((last,row)=>row[4]>last?row[4]:last,rows[0][4]);
  const evidence=['shared-completion-v1',database,schema,subjectId,e.status,e.student_id,e.approved_by,e.approved_at_utc,rows];
  const snapshotSha256=createHash('sha256').update(JSON.stringify(evidence),'utf8').digest('hex');
  return Object.freeze({category:'completed_shared_enrollment',subjectId,courseCount:rows.length,
    courseKeys:Object.freeze(rows.map(row=>row[0])),latestCompletedAt,snapshotSha256,executionAuthorized:false});
}
