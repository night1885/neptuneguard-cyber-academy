import test from 'node:test';
import assert from 'node:assert/strict';
import {ContainerBuilder,TextDisplayBuilder,ActionRowBuilder,MessageFlagsBitField} from 'discord.js';
import {academyCardPayload} from './academy-course-card-ui.mjs';
test('pinned SDK serializes horizontal catalogue controls',()=>{
 const p=academyCardPayload({flags:64,embeds:[{title:'Academy course catalog',description:'Listing does not grant access.'}],components:[{type:1,components:[{type:2,style:2,label:'Linux Fundamentals',custom_id:'cert:course:open:linux-fundamentals'}]}]});
 for(const c of p.components){const b=c.type===17?new ContainerBuilder(c):c.type===10?new TextDisplayBuilder(c):new ActionRowBuilder(c);assert.deepEqual(JSON.parse(JSON.stringify(b.toJSON())),c);}
 const flags=new MessageFlagsBitField(p.flags);assert.ok(flags.has(64));assert.ok(flags.has(32768));
});

test('pinned SDK preserves the five-button catalogue row and its navigation',()=>{const courses=Array.from({length:5},(_,n)=>({type:2,style:2,label:'Course '+n,custom_id:'cert:course:open:fixture-'+n})),p=academyCardPayload({flags:64,embeds:[{title:'Academy course catalog',description:'Page 1/2.'}],components:[{type:1,components:courses},{type:1,components:[{type:2,style:2,label:'Next courses',custom_id:'cert:course:catalog:1'}]}]});const rows=p.components.filter(c=>c.type===1);assert.equal(rows.length,2);assert.deepEqual(rows[0].components,courses);for(const c of p.components){const builder=c.type===17?new ContainerBuilder(c):c.type===10?new TextDisplayBuilder(c):new ActionRowBuilder(c);assert.deepEqual(JSON.parse(JSON.stringify(builder.toJSON())),c);}});

test('pinned SDK serializes red Ethical Hacking and green Bug Bounty catalogue buttons',()=>{const source=[{type:2,style:2,label:'Ethical Hacking',custom_id:'cert:course:open:ethical-hacking-reading'},{type:2,style:2,label:'Bug Bounty',custom_id:'cert:course:open:bug-bounty-reading'}],p=academyCardPayload({flags:64,embeds:[{title:'Academy course catalog'}],components:[{type:1,components:source}]});assert.deepEqual(p.components.find(c=>c.type===1).components.map(b=>b.style),[4,3]);assert.deepEqual(source.map(b=>b.style),[2,2]);for(const c of p.components){const builder=c.type===17?new ContainerBuilder(c):c.type===10?new TextDisplayBuilder(c):new ActionRowBuilder(c);assert.deepEqual(JSON.parse(JSON.stringify(builder.toJSON())),c);}});
