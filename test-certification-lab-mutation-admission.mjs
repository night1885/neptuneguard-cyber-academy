import test from 'node:test';
import assert from 'node:assert/strict';
import {createLabActionHandler} from './certification-lab-actions.js';
const owner='1223123544301633567',student='1223123544301633568',guild='1330353166830665859';
const request='00000000-0000-4000-8000-000000000001';
function fixture(action='deny') {
  let now=0,ready=true,fail=false,status=action==='deny'?'pending':'approved';
  const reads=[],transactions=[],writes=[],replies=[];
  const pool={async query(sql,params){
    if(sql.includes('pg_catalog.pg_attribute')) {
      reads.push('readiness'); if(fail)throw new Error('PRIVATE fixture driver error');
      return {rows:Object.entries({request_id:['uuid',true],discord_user_id:['text',true],status:['text',true],status_reason:['text',false],updated_at:['timestamp with time zone',true]})
        .filter(([name])=>ready||name!=='status_reason').map(([attname,[type,attnotnull]])=>({attname,type,attnotnull,relkind:'r',atthasdef:false,attgenerated:'',attidentity:''}))};
    }
    assert.match(sql,/^SELECT request_id/); reads.push('preview');
    return {rows:[{request_id:request,discord_user_id:student,status}]};
  },async connect(){return {async query(sql,params){
    transactions.push(sql);
    if(sql.startsWith('SELECT'))return {rows:[{request_id:request,discord_user_id:student,status}]};
    if(sql.startsWith('UPDATE')){writes.push(params);status=params[1];return {rowCount:1,rows:[{request_id:request}]};}
    return {rows:[]};
  },release(discard){assert.equal(discard,false);}};}};
  const handler=createLabActionHandler(pool,{enabled:true,ownerId:owner},guild,{now:()=>now});
  async function send(customId,{modal=false,actor=owner,server=guild}={}) {
    const messages=[];
    await handler({customId,user:{id:actor},guildId:server,isButton:()=>!modal,isModalSubmit:()=>modal,
      fields:{getTextInputValue:()=> 'Fixture reason'},
      async reply(p){messages.push(p);},async deferReply(p){assert.equal(p.flags,64);},
      async editReply(p){messages.push(p);},async showModal(p){messages.push(p);}});
    replies.push(...messages);return messages.at(-1);
  }
  async function preview(){return send(`cert:labact:${action}:${request}`,{modal:true});}
  return {send,preview,reads,transactions,writes,replies,setReady(v){ready=v;},setFail(v){fail=v;},expire(){now+=300000;}};
}
const confirm=p=>p.components[0].components[0].custom_id;
const cancel=p=>p.components[0].components[1].custom_id;
for(const action of ['deny','revoke','suspend']){
  test(`${action}: actual handler and service block missing columns then permit fresh confirmation`,async()=>{
    const f=fixture(action),p=await f.preview(),token=confirm(p);
    f.setReady(false);const blocked=await f.send(token);
    assert.match(blocked.content,/unavailable/);assert.deepEqual(f.writes,[]);assert.deepEqual(f.transactions,[]);
    const count=f.reads.length;await f.send(token);assert.equal(f.reads.length,count);
    f.setReady(true);await f.send(confirm(await f.preview()));
    assert.equal(f.writes.length,1);assert.ok(f.transactions.includes('COMMIT'));
    assert.ok(f.transactions.some(sql=>sql.startsWith('INSERT INTO certification_audit_events')));
  });
}
test('wrong actor/server cannot consume a valid confirmation or read readiness',async()=>{
  const f=fixture(),token=confirm(await f.preview()),count=f.reads.length;
  await f.send(token,{actor:student});await f.send(token,{server:student});
  assert.equal(f.reads.length,count);assert.equal(f.writes.length,0);
  await f.send(token);assert.equal(f.writes.length,1);
});
test('cancel consumes token without readiness or mutation',async()=>{
  const f=fixture(),p=await f.preview(),count=f.reads.length;
  await f.send(cancel(p));await f.send(confirm(p));
  assert.equal(f.reads.length,count);assert.equal(f.writes.length,0);
});
test('expired confirmation does not read readiness or open transaction',async()=>{
  const f=fixture(),p=await f.preview(),count=f.reads.length;f.expire();await f.send(confirm(p));
  assert.equal(f.reads.length,count);assert.equal(f.transactions.length,0);
});
test('readiness driver failure is sanitized before actual service admission',async()=>{
  const f=fixture(),p=await f.preview();f.setFail(true);await f.send(confirm(p));
  assert.equal(f.transactions.length,0);assert.doesNotMatch(JSON.stringify(f.replies),/PRIVATE/);
});
test('opening a form and previewing do not perform readiness or writes',async()=>{
  const f=fixture();await f.send(`cert:labact:deny:${request}`);await f.preview();
  assert.deepEqual(f.reads,['preview']);assert.equal(f.writes.length,0);
});
