// Pure policy calculations. No database, scheduler, filesystem or deletion operation.
export const FORMAL_LEARNING_RETENTION_POLICY='formal-learning-data-24h-v1';
const DAY_US=86400000000n;
const MAX_US=BigInt(Date.UTC(9999,0,1))*1000n-1n;
const courses=new Set(['ethical-hacking','incident-response']);
const categories=new Set(['submission','feedback','reading_position','certificate_verification']);
function fields(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error('Plain retention data required');
 const names=Reflect.ownKeys(value);if(names.length!==keys.length||keys.some(k=>!names.includes(k)))throw new Error('Unexpected retention fields');
 const result={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(value,k);if(!d||!Object.hasOwn(d,'value'))throw new Error('Retention accessor refused');result[k]=d.value;}return result;
}
function instant(value){
 const m=typeof value==='string'&&/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
 if(!m)throw new Error('Explicit-offset ISO time with at most six fractional digits required');
 const [year,month,day,hour,minute,second]=m.slice(1,7).map(Number),oh=Number(m[10]||0),om=Number(m[11]||0);
 if(year<1970||year>9998||month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59||oh>23||om>59)throw new Error('Invalid retention time');
 const offset=(oh*60+om)*(m[9]==='-'?-1:1);
 const us=BigInt(Date.UTC(year,month-1,day,hour,minute,second)-offset*60000)*1000n+BigInt((m[7]||'').padEnd(6,'0'));
 if(us<0n||us>MAX_US)throw new Error('Retention time outside supported range');return us;
}
function iso(us){return new Date(Number(us/1000000n)*1000).toISOString().slice(0,19)+'.'+String(us%1000000n).padStart(6,'0')+'Z';}
export function formalLearningDeletionEligibleAt(exitAt){const due=instant(exitAt)+DAY_US;if(due>MAX_US)throw new Error('Retention deadline outside supported range');return iso(due);}
export function evaluateFormalLearningRetention(raw){
 const input=fields(raw,['courseKey','category','enrollmentRef','terminalEvent','now']);
 if(!courses.has(input.courseKey)||!categories.has(input.category)||typeof input.enrollmentRef!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(input.enrollmentRef))throw new Error('Explicit formal-course record binding required');
 const now=instant(input.now);
 const result=(status,eligibleAt=null)=>Object.freeze({policyVersion:FORMAL_LEARNING_RETENTION_POLICY,courseKey:input.courseKey,category:input.category,status,eligibleAt,destructiveActionAuthorized:false});
 if(input.category==='certificate_verification')return result('excluded-from-24h-cleanup');
 if(input.terminalEvent===null)return result('no-terminal-event');
 const event=fields(input.terminalEvent,['courseKey','enrollmentRef','kind','occurredAt']);
 if(event.courseKey!==input.courseKey||event.enrollmentRef!==input.enrollmentRef||!['completed','left'].includes(event.kind))throw new Error('Matching authoritative completion/exit event required');
 const exit=instant(event.occurredAt);if(exit>now)throw new Error('Future terminal event refused');
 const due=exit+DAY_US;if(due>MAX_US)throw new Error('Retention deadline outside supported range');
 return result(now>=due?'due':'waiting',iso(due));
}
