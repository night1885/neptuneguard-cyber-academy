import assert from 'node:assert/strict';
const json=value=>typeof value?.toJSON==='function'?value.toJSON():value;
export function flattenCourseComponents(items=[]) {
  assert.ok(Array.isArray(items));
  return items.flatMap(raw=>{const item=json(raw);assert.ok(item&&typeof item==='object');return [item,...(Array.isArray(item.components)?flattenCourseComponents(item.components):[])];});
}
export function courseMessageControls(payload) {
  return flattenCourseComponents(payload.components||[]).filter(item=>item.type===2||item.type===3);
}
export function courseMessageText(payload) {
  const embeds=(payload.embeds||[]).map(json);
  return [payload.content,...embeds.flatMap(e=>[e.title,e.description,e.footer?.text,...(e.fields||[]).flatMap(f=>[f.name,f.value])]),...flattenCourseComponents(payload.components||[]).filter(c=>c.type===10).map(c=>c.content)].filter(value=>typeof value==='string').join('\n');
}
export function assertCourseMessageBounds(payload) {
  assert.deepEqual(payload.allowedMentions,{parse:[]});
  const components=payload.components||[];assert.ok(Array.isArray(components));
  if((payload.flags||0)&32768) {
    assert.ok(!('content' in payload));assert.ok(!('embeds' in payload));
    const nodes=flattenCourseComponents(components);assert.ok(nodes.length>0&&nodes.length<=40);
    const text=nodes.filter(c=>c.type===10);assert.ok(text.every(c=>typeof c.content==='string'&&c.content.length>0));
    assert.ok(text.reduce((total,c)=>total+c.content.length,0)<=4000);
  } else assert.ok(components.length<=5);
}
export function assertCourseTeachingView(payload) {
  assertCourseMessageBounds(payload);assert.equal((payload.flags||0)&32768,32768);
  assert.ok(flattenCourseComponents(payload.components).some(c=>c.type===17));
  assert.match(courseMessageText(payload),/Read-only learning/);
}
