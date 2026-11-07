import test from 'node:test';
import assert from 'node:assert/strict';
import {ContainerBuilder,TextDisplayBuilder,ActionRowBuilder,MessageFlagsBitField} from 'discord.js';
import {academyCardPayload} from './academy-course-card-ui.mjs';
test('pinned SDK serializes generated catalog cards',()=>{
 const p=academyCardPayload({flags:64,embeds:[{title:'Academy course catalog',description:'Listing does not grant access.'}],components:[{type:1,components:[{type:2,style:2,label:'Linux Fundamentals',custom_id:'cert:course:open:linux-fundamentals'}]}]});
 for(const c of p.components){const b=c.type===17?new ContainerBuilder(c):c.type===10?new TextDisplayBuilder(c):new ActionRowBuilder(c);assert.deepEqual(b.toJSON(),c);}
 const flags=new MessageFlagsBitField(p.flags);assert.ok(flags.has(64));assert.ok(flags.has(32768));
});
