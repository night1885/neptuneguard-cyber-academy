// Offline FICTIONAL first-practical review rehearsal. No real evidence or runtime imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyntheticWorkspace } from './workspace.mjs';
import { createSyntheticReviewStore } from './review.mjs';
const learner=Object.freeze({actorId:'demo-learner-first',workspaceId:'demo-workspace-first',courseKey:'demo-ethical-hacking',privateWorkspace:true});
const reviewer=Object.freeze({...learner,actorId:'demo-reviewer-first'});
const other=Object.freeze({...learner,actorId:'demo-learner-other'});
function setup(t){
 const state={assigned:new Set([learner.actorId,reviewer.actorId,other.actorId]),clock:0,reviewChecks:0,revokeOnReviewCheck:0};
 const current=q=>state.assigned.has(q.actorId)&&q.workspaceId===learner.workspaceId&&q.courseKey===learner.courseKey&&q.privateWorkspace===true;
 const authorize=async q=>{
  if(q.action==='review'&&++state.reviewChecks===state.revokeOnReviewCheck)state.assigned.delete(q.actorId);
  return current(q)&&(q.action==='review'?q.actorId===reviewer.actorId:
   q.actorId===q.ownerId||(q.action==='read'&&q.actorId===reviewer.actorId));
 };
 const store=createSyntheticReviewStore({authorize});t.after(()=>store.dispose());
 function viewer(ctx,id){
  const context={...ctx,messageId:'demo-message-'+(ctx.actorId===learner.actorId?'learner':'reviewer')};
  const app=createSyntheticWorkspace({authorize:async q=>current(q),now:()=>state.clock,ttlMs:1000,
   async loadPage(){const result=await store.read(ctx,id);if(!result.ok)throw new Error('Unavailable');
    const {status,revision,evidenceRef,feedbackRef}=result.record;
    return{title:'FICTIONAL first-practical review',body:JSON.stringify({status,revision,evidenceRef,feedbackRef})};}});
  t.after(()=>app.dispose());
  return{app,open:()=>app.open(context),refresh:opened=>app.navigate({...context,token:opened.sessionToken,cursor:'lesson'})};
 }
 return{store,state,authorize,viewer};
}
const submit=(id,revision,request,evidence)=>({recordId:id,expectedRevision:revision,requestId:request,evidenceRef:evidence});
const review=(id,revision,request,decision,feedback)=>({recordId:id,expectedRevision:revision,requestId:request,decision,feedbackRef:feedback});
const rendered=r=>JSON.parse(r.payload.embeds[0].description);

test('FICTIONAL first-practical feedback revision and final review use existing engines',async t=>{
 const f=setup(t),trace=[];
 function capture(stage,result){assert.equal(result.ok,true);trace.push({stage,status:result.record.status,revision:result.record.revision,
  evidenceRef:result.record.evidenceRef,feedbackRef:result.record.feedbackRef,persisted:result.persisted,evidenceCollected:result.evidenceCollected,grantsAccess:result.grantsAccess,awardsIssued:result.awardsIssued});}
 const initial=await f.store.create(learner),id=initial.record.id;capture('create-fictional-work',initial);
 const lv=f.viewer(learner,id),opened=await lv.open();assert.equal(opened.ok,true);
 capture('submit-fictional-reference-v1',await f.store.submit(learner,submit(id,0,'demo-first-submit-v1','demo-evidence-first-practical-v1')));
 const rv=f.viewer(reviewer,id);assert.equal((await rv.open()).ok,true);
 capture('bounded-fictional-feedback',await f.store.review(reviewer,review(id,1,'demo-first-review-v1','changes-requested','demo-feedback-clarify-limit')));
 assert.equal(rendered(await lv.refresh(opened)).feedbackRef,'demo-feedback-clarify-limit');
 capture('resubmit-fictional-reference-v2',await f.store.submit(learner,submit(id,2,'demo-first-submit-v2','demo-evidence-first-practical-v2')));
 capture('record-fictional-review',await f.store.review(reviewer,review(id,3,'demo-first-review-v2','review-recorded','demo-feedback-review-note')));
 const refreshed=await lv.refresh(opened);
 assert.equal(rendered(refreshed).status,'review-recorded');assert.equal(rendered(refreshed).revision,4);
 assert.equal(refreshed.messageId,opened.messageId);assert.equal(refreshed.operation,'edit-existing-private-message');
 assert.equal(refreshed.progressSaved,false);
 assert.ok(trace.every(r=>r.persisted===false&&r.evidenceCollected===false&&r.grantsAccess===false&&r.awardsIssued===false));
 console.log('FICTIONAL_REHEARSAL_REPORT '+JSON.stringify({mode:'offline-fictional-state-rehearsal',practicalExecution:false,realLearnerData:false,transitions:trace}));
});

test('assigned other learner cannot see the fictional first-practical reference',async t=>{
 const f=setup(t),created=await f.store.create(learner),id=created.record.id;
 await f.store.submit(learner,submit(id,0,'demo-first-submit-v1','demo-evidence-first-practical-v1'));
 const result=await f.viewer(other,id).open();assert.equal(result.ok,false);
 assert.equal(JSON.stringify(result).includes('demo-evidence-first-practical-v1'),false);
});

test('duplicate first submission is idempotent and stale review cannot overwrite a revision',async t=>{
 const f=setup(t),created=await f.store.create(learner),id=created.record.id;
 const command=submit(id,0,'demo-first-submit-v1','demo-evidence-first-practical-v1');
 assert.deepEqual(await f.store.submit(learner,command),await f.store.submit(learner,command));
 assert.equal((await f.store.review(reviewer,review(id,0,'demo-stale-review','review-recorded','demo-feedback-stale'))).reason,'conflict');
 const snapshot=await f.store.read(learner,id);assert.equal(snapshot.record.revision,1);assert.equal(snapshot.record.status,'submitted');assert.equal(snapshot.record.feedbackRef,null);
});

test('reviewer revocation during confirmation leaves the submitted revision untouched',async t=>{
 const f=setup(t),created=await f.store.create(learner),id=created.record.id;
 await f.store.submit(learner,submit(id,0,'demo-first-submit-v1','demo-evidence-first-practical-v1'));
 f.state.revokeOnReviewCheck=2;
 assert.equal((await f.store.review(reviewer,review(id,1,'demo-revoked-review','review-recorded','demo-feedback-denied'))).ok,false);
 const snapshot=await f.store.read(learner,id);assert.equal(snapshot.record.status,'submitted');assert.equal(snapshot.record.revision,1);assert.equal(snapshot.record.feedbackRef,null);
});

test('arbitrary URLs and fabricated transcript text cannot replace demo references',async t=>{
 const f=setup(t),created=await f.store.create(learner),id=created.record.id;
 for(const evidence of ['https://example.invalid/evidence','FICTIONAL command transcript']){
  assert.equal((await f.store.submit(learner,submit(id,0,'demo-invalid-evidence',evidence))).ok,false);
 }
 assert.equal((await f.store.read(learner,id)).record.status,'working');
});

test('formal-course namespace cannot be passed off as a synthetic review record',async t=>{
 const f=setup(t);assert.equal((await f.store.create({...learner,courseKey:'formal-ethical-hacking'})).ok,false);
});

test('client owner or review-state claims are rejected rather than trusted',async t=>{
 const f=setup(t),created=await f.store.create(learner),id=created.record.id;
 assert.equal((await f.store.read({...other,ownerId:learner.actorId},id)).ok,false);
 const command=submit(id,0,'demo-forged-state','demo-evidence-first-practical-v1');
 assert.equal((await f.store.submit(learner,{...command,status:'review-recorded'})).ok,false);
 assert.equal((await f.store.read(learner,id)).record.status,'working');
});

test('expiry and disposal cannot be reported as durable first-practical recovery',async t=>{
 const f=setup(t),created=await f.store.create(learner),id=created.record.id,lv=f.viewer(learner,id),opened=await lv.open();
 f.state.clock=1001;assert.equal((await lv.refresh(opened)).ok,false);
 f.store.dispose();const fresh=createSyntheticReviewStore({authorize:f.authorize});t.after(()=>fresh.dispose());
 assert.equal((await fresh.read(learner,id)).ok,false);
});
