import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { refreshDemoTemplate } from './build-browser-demo.mjs';

const source = name => "import { randomUUID } from 'node:crypto';\nexport function " + name + "() { return randomUUID(); }\n";
const sources = { review: source('createSyntheticReviewStore'), controls: source('createSyntheticControls') };
const prefix = '<!doctype html><html><head><style>body{color:white}</style></head><body><h1>Original interface</h1><script>const demoUUID = () => { return "demo"; };\n';
const suffix = 'const $ = id => document.getElementById(id);\nconst untouchedUi = "preserve this";\n</script></body></html>';
const template = prefix + 'const createSyntheticReviewStore = (() => { /* old core */ return null; })();\n' + suffix;

test('replaces only core and preserves surrounding UI exactly', () => {
  const result = refreshDemoTemplate(template, sources);
  assert.ok(result.html.startsWith(prefix)); assert.ok(result.html.endsWith(suffix));
  assert.equal(result.html.includes('old core'), false);
  assert.ok(result.html.includes('const randomUUID = demoUUID;'));
  assert.equal(result.provenance.outsideCorePreserved, true);
});

test('records UTF-8 Git blob and template/output hashes', () => {
  const result = refreshDemoTemplate(template, sources), text = sources.review;
  const hash = createHash('sha1').update('blob ' + Buffer.byteLength(text, 'utf8') + '\0').update(text, 'utf8').digest('hex');
  assert.equal(result.provenance.reviewGitBlob, hash);
  assert.equal(result.provenance.templateSha256, createHash('sha256').update(template).digest('hex'));
  assert.equal(result.provenance.outputSha256, createHash('sha256').update(result.html).digest('hex'));
  assert.equal(result.provenance.browserExecuted, false);
});

test('missing duplicate or reordered markers fail closed', () => {
  for (const input of [template.replace('const $ = id', 'const changed = id'), template + '<script></script>',
    template + 'const $ = id => document.getElementById(id);', suffix + prefix + 'const createSyntheticReviewStore = (() => {']) {
    assert.throws(() => refreshDemoTemplate(input, sources));
  }
});

test('extra static imports are not bundled silently', () => {
  assert.throws(() => refreshDemoTemplate(template, { ...sources, review: sources.review + "import x from 'unexpected';\n" }));
});

test('missing expected export or extra exports require review', () => {
  assert.throws(() => refreshDemoTemplate(template, { ...sources, review: sources.review.replace('export function', 'function') }));
  assert.throws(() => refreshDemoTemplate(template, { ...sources, controls: sources.controls + 'export const extra = 1;\n' }));
});

test('closing-script fragments in source are rejected', () => {
  assert.throws(() => refreshDemoTemplate(template, { ...sources, review: sources.review + '// </script>\n' }));
});

test('adapted combined script parses with separate module scopes', () => {
  const result = refreshDemoTemplate(template, sources);
  const script = result.html.split('<script>')[1].split('</script>')[0];
  assert.doesNotThrow(() => new Script(script));
});

test('CLI writes a new output and refuses overwrite without changing it', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'offline-demo-build-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'build-browser-demo.mjs'), await readFile(new URL('./build-browser-demo.mjs', import.meta.url)));
  await writeFile(join(directory, 'review.mjs'), sources.review);
  await writeFile(join(directory, 'controls.mjs'), sources.controls);
  await writeFile(join(directory, 'template.html'), template);
  const args = ['build-browser-demo.mjs', '--template', 'template.html', '--output', 'new-demo.html'];
  const first = spawnSync(process.execPath, args, { cwd: directory, encoding: 'utf8', timeout: 5000 });
  assert.equal(first.status, 0, first.stderr);
  const before = await readFile(join(directory, 'new-demo.html'), 'utf8');
  assert.equal(JSON.parse(first.stdout).outsideCorePreserved, true);
  const second = spawnSync(process.execPath, args, { cwd: directory, encoding: 'utf8', timeout: 5000 });
  assert.notEqual(second.status, 0);
  assert.equal(await readFile(join(directory, 'new-demo.html'), 'utf8'), before);
  assert.equal(await readFile(join(directory, 'template.html'), 'utf8'), template);
});
