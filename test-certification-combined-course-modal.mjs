import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombinedRegistrationRouter} from './certification-combined-registration-router.mjs';
const S='100000000000000002',G='100000000000000003',C='100000000000000004',T='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
for(const [id,allowed]of [['cert:course:submit:'+T,true],['cert:course:submit:bad',false],['cert:course:unsafe:'+T,false]])test('course modal admission: '+id,async()=>{
 const base=Object.assign(async i=>{await i.showModal({custom_id:id});return true;},{initialize:async()=>{},dispose:async()=>{}});
 const decisions=Object.assign(async()=>true,{ready:true,initialize:async()=>({ready:true}),dispose:async()=>{}});
 const policy={classify:()=>null,allowsStudent:()=>false,allowsButton:()=>false,allowsModal:()=>false};
 const route=createCombinedRegistrationRouter({settings:{enabled:true,combined:true,ownerId:'100000000000000001',guildId:G,adminChannelId:C,studentIds:[S]},policy,base,ownerDecisions:decisions,registration:async()=>true,learner:async()=>true});
 await route.initialize();const i={customId:'cert:course:open:fixture',user:{id:S},guildId:G,guild:{id:G},channelId:C,isButton:()=>true,isModalSubmit:()=>false,isStringSelectMenu:()=>false,async showModal(p){this.modal=p;}};
 try{if(allowed){assert.equal(await route(i),true);assert.equal(i.modal.custom_id,id);}else await assert.rejects(route(i),/Modal not admitted/);}finally{await route.dispose();}
});
