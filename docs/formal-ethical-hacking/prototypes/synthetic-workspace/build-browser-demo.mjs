// Local offline-demo refresh tool. Trusted reviewed templates/sources only.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE = 'const createSyntheticReviewStore = (() => {';
const UI = 'const $ = id => document.getElementById(id);';
const UUID_IMPORT = "import { randomUUID } from 'node:crypto';";
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const gitBlob = text => createHash('sha1').update('blob ' + Buffer.byteLength(text, 'utf8') + '\0').update(text, 'utf8').digest('hex');
const once = (text, marker) => text.split(marker).length === 2;
function wrap(source, name) {
  const declaration = 'export function ' + name + '(';
  if (typeof source !== 'string' || !once(source, UUID_IMPORT) || !once(source, declaration) || /<\/script/i.test(source)) throw new Error('Unsupported reviewed source shape');
  const body = source.replace(UUID_IMPORT, 'const randomUUID = demoUUID;').replace(declaration, 'function ' + name + '(');
  if (/^\s*(?:import|export)\s/m.test(body)) throw new Error('Additional module syntax requires review');
  return 'const ' + name + ' = (() => {\n' + body + '\nreturn ' + name + ';\n})();\n';
}

export function refreshDemoTemplate(template, { review, controls } = {}) {
  if (typeof template !== 'string' || !once(template, '<script>') || !once(template, '</script>') ||
      !once(template, MODULE) || !once(template, UI)) throw new Error('Exact original-demo markers required');
  const open = template.indexOf('<script>') + '<script>'.length, close = template.indexOf('</script>');
  const start = template.indexOf(MODULE), end = template.indexOf(UI);
  if (!(open <= start && start < end && end < close) || !template.slice(open, start).includes('const demoUUID = () => {')) throw new Error('Unsupported demo script layout');
  const core = wrap(review, 'createSyntheticReviewStore') + wrap(controls, 'createSyntheticControls');
  const html = template.slice(0, start) + core + template.slice(end);
  return { html, provenance: { kind: 'offline-synthetic-browser-core-refresh',
    reviewGitBlob: gitBlob(review), controlsGitBlob: gitBlob(controls),
    templateSha256: sha256(template), outputSha256: sha256(html),
    outsideCorePreserved: html.startsWith(template.slice(0, start)) && html.endsWith(template.slice(end)),
    browserExecuted: false } };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--template' || args[2] !== '--output') throw new Error('Explicit template and output required');
  const [template, review, controls] = await Promise.all([
    readFile(resolve(args[1]), 'utf8'), readFile(new URL('./review.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./controls.mjs', import.meta.url), 'utf8')
  ]);
  const result = refreshDemoTemplate(template, { review, controls });
  await writeFile(resolve(args[3]), result.html, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(JSON.stringify(result.provenance, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { process.stderr.write('Offline demo refresh failed; check reviewed inputs, arguments and a new output filename.\n'); process.exitCode = 1; });
}
