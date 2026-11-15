# Observe prototype changes in an isolated JavaScript object

## Outcome and prerequisites

Distinguish inherited properties from an object's own fields and explain why merging untrusted keys can change behavior. Complete JSON and property-permission lessons. Use an approved local Node.js installation, obtained through its official project or your approved package repository. No external package or browser is needed. Do not run a prototype-pollution probe against real applications or shared services to complete this example.

A JavaScript object can inherit properties from its prototype. A dangerous merge path can change that relationship, while later code may mistakenly trust an inherited setting. The consequence depends on the consumer, sometimes called a gadget. A property change alone does not prove a real application's security impact.

## Local JavaScript exercise

Check the installed version, then run this self-contained process:

```bash
node --version
node <<'JS'
const incoming = JSON.parse('{"displayName":"A","__proto__":{"labMarker":"synthetic"}}');
const unsafe = {};
Object.assign(unsafe, incoming);
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
console.log('unsafe inherited marker:', unsafe.labMarker);
console.log('marker is own field:', own(unsafe, 'labMarker'));
const safe = {};
for (const key of ['displayName']) {
  if (own(incoming, key) && typeof incoming[key] === 'string') safe[key] = incoming[key];
}
console.log('safe display:', safe.displayName);
console.log('safe inherited marker:', safe.labMarker);
console.log('global prototype unchanged:', !own(Object.prototype, 'labMarker'));
if (unsafe.labMarker !== 'synthetic' || own(unsafe, 'labMarker')
    || safe.labMarker !== undefined || own(Object.prototype, 'labMarker')) {
  throw new Error('Unexpected local prototype behavior');
}
JS
```

Expected: synthetic; false; A; undefined; true. The parsed input owns a key named __proto__. On a normal object, Object.assign can invoke the inherited setter and change that particular target's prototype. The example does not modify Object.prototype, execute a command or open a network connection. It demonstrates this merge path, not every JSON parser or deep-merge library.

The safe copy uses an explicit editable-field list. Do not present a short special-key blacklist as complete remediation. Also enforce schema, type and application permissions; a permitted display field and a privileged role are different concerns.

## Program-based reasoning

Within already-permitted observations, map where client or server code merges untrusted properties and which later consumer reads inherited values. Do not insert special keys into live requests by default. A client-side test needs a controlled isolated context and explicit applicable permission. Server-side probing needs particular care because process state and other users may be affected.

Use source review only where access permits it. A reference to a merge library or a dependency version is not evidence of an exploitable path. Explain the input source, merge behavior, consumer and supported consequence separately.

## Exercise and explained answers

Why does unsafe.labMarker exist while the own-field check is false? Property lookup follows the prototype chain. The marker belongs to the target's new prototype, not to the target itself.

Does the safe result prove every merge in an application is secure? No. This is one local allowlisted copy with one input. Other consumers and paths need their own evidence.

## Troubleshooting and cleanup

If a runtime disables the __proto__ setter, behavior may differ or throw. Record the actual Node version/options; do not disable security controls to force the expected result. When the process exits, these isolated objects are discarded. No real account or service was touched.

## Source and validation limit

https://portswigger.net/web-security/prototype-pollution

Only this isolated Node process is executed. No browser or live server-side pollution is claimed.
