// Detached custody state machine. Persistence and authorization belong to callers.
const fail=()=>Error('Custody state unavailable');
function exact(x,keys){if(!x||typeof x!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(x)))throw fail();const ds=Object.getOwnPropertyDescriptors(x),wanted=keys.split(',');if(Reflect.ownKeys(ds).length!==wanted.length)throw fail();const c={};for(const k of wanted){if(!ds[k]||!Object.hasOwn(ds[k],'value'))throw fail();c[k]=ds[k].value;}return c;}
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x),uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);
function scope(x){const s=exact(x,'actorId,contentRevision,courseKey,generation,guildId');if(!snow(s.actorId)||!snow(s.guildId)||s.courseKey!=='standalone-web-review'||typeof s.contentRevision!=='string'||!/^[a-f0-9]{64}$/.test(s.contentRevision)||!Number.isSafeInteger(s.generation)||s.generation<1||s.generation>=Number.MAX_SAFE_INTEGER)throw fail();return s;}
export function inspectCommand(x){const c=exact(x,'expectedRevision,operationId,pageKey');if(!uuid(c.operationId)||!Number.isSafeInteger(c.expectedRevision)||c.expectedRevision<0||c.expectedRevision>=Number.MAX_SAFE_INTEGER-1||!['entry','http'].includes(c.pageKey))throw fail();return Object.freeze(c);}
function receipt(x,s){const r=exact(x,'actorId,contentRevision,courseKey,expectedRevision,generation,guildId,operationId,outcome,pageKey,resultRevision');if(!same(s.scope,r)||!same(s.command,r)||!['saved','conflict'].includes(r.outcome)||(r.outcome==='saved'?r.resultRevision!==s.command.expectedRevision+1:r.resultRevision!==null))throw fail();return r;}
function freeze(s){return Object.freeze({...s,scope:Object.freeze({...s.scope}),command:s.command&&Object.freeze({...s.command}),receipt:s.receipt&&Object.freeze({...s.receipt})});}
export function inspectState(x){const s=exact(x,'command,format,phase,receipt,scope,sequence');s.scope=scope(s.scope);if(s.format!==1||!['idle','prepared','pending','uncertain','resolved'].includes(s.phase)||!Number.isSafeInteger(s.sequence)||s.sequence<0||s.sequence>=Number.MAX_SAFE_INTEGER)throw fail();if(s.phase==='idle'){if(s.command!==null||s.receipt!==null)throw fail();}else{s.command=inspectCommand(s.command);if(s.phase==='resolved')s.receipt=receipt(s.receipt,s);else if(s.receipt!==null)throw fail();}return freeze(s);}
export function createState(s){return inspectState({format:1,scope:scope(s),sequence:0,phase:'idle',command:null,receipt:null});}
export function transition(input,type,payload=null){const s=inspectState(input);let patch;
 if(type==='prepare'){const c=inspectCommand(payload);if(s.phase==='resolved'&&c.operationId===s.command.operationId)throw fail();if(!['idle','resolved'].includes(s.phase))return s;patch={phase:'prepared',command:c,receipt:null};}
 else if(type==='dispatch'){const c=inspectCommand(payload);if(s.phase!=='prepared'||!same(c,s.command))return s;patch={phase:'pending'};}
 else if(type==='uncertain'){const c=inspectCommand(payload);if(s.phase!=='pending'||!same(c,s.command))return s;patch={phase:'uncertain'};}
 else if(type==='receipt'){if(!['pending','uncertain'].includes(s.phase))return s;patch={phase:'resolved',receipt:receipt(payload,s)};}
 else if(type==='restart'){if(payload!==null)throw fail();if(s.phase!=='pending')return s;patch={phase:'uncertain'};}
 else throw fail();
 if(s.sequence>=Number.MAX_SAFE_INTEGER-1)throw fail();return inspectState({...s,...patch,sequence:s.sequence+1});
}
