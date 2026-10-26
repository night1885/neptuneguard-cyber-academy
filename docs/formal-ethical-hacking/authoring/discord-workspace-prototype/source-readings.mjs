// In-memory pinned-source compiler only. Never reads a path or executes source text.
import { createHash } from 'node:crypto';
const shape = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === keys;
const hash = (algorithm, value) => createHash(algorithm).update(value).digest('hex');

export function splitReviewSource(text) {
  if (typeof text !== 'string' || !text.trim() || text.includes('\0') || Buffer.byteLength(text, 'utf8') > 32768) throw new Error('Invalid source text');
  const pages = [];
  let raw = '', prefix = '', fence = null;
  const display = (body, state) => prefix + body + (state ? (body.endsWith('\n') ? '' : '\n') + '```' : '');
  const flush = () => {
    if (raw) pages.push(Object.freeze({ raw, display: display(raw, fence) }));
    raw = ''; prefix = fence ? fence + '\n' : '';
  };
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) || []) {
    if (line.length > 1200) throw new Error('Source line exceeds reviewed bounds');
    let after = fence;
    if (fence && /^```[ \t]*(?:\r?\n)?$/.test(line)) after = null;
    else if (!fence && /^```/.test(line)) {
      if (!/^```[A-Za-z0-9+-]{0,20}[ \t]*(?:\r?\n)?$/.test(line)) throw new Error('Unsupported fence');
      after = line.trim();
    } else if (!fence && /^~{3,}/.test(line)) throw new Error('Unsupported fence');
    if (display(raw + line, after).length > 1400 && raw) flush();
    if (display(line, after).length > 1400) throw new Error('Source cannot fit a reviewed page');
    raw += line; fence = after;
  }
  if (fence) throw new Error('Unclosed source fence');
  flush();
  if (!pages.length || pages.length > 40 || pages.map(page => page.raw).join('') !== text) throw new Error('Incomplete source split');
  return Object.freeze(pages);
}

export function compileLessonReadings({ catalogue, manifest, sources } = {}) {
  if (!catalogue || !Array.isArray(catalogue.lessons) || catalogue.lessons.length > 60 ||
      !shape(manifest, 'entries,publishable,runtimeIntegration,schemaVersion,sourceCommit,status') ||
      manifest.schemaVersion !== 1 || manifest.status !== 'draft-source-review' || manifest.runtimeIntegration !== false ||
      manifest.publishable !== false || typeof manifest.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
      !Array.isArray(manifest.entries) || !manifest.entries.length || manifest.entries.length > 37 ||
      !sources || typeof sources !== 'object' || Array.isArray(sources)) throw new Error('Reviewed source manifest required');
  const allowed = new Set(catalogue.lessons.map(row => row.id)), ids = new Set();
  for (const entry of manifest.entries) {
    if (!shape(entry, 'gitBlob,id,path,sha256') || !allowed.has(entry.id) || ids.has(entry.id) || typeof entry.id !== 'string' || entry.id.length > 45 ||
        !/^EH-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(entry.id) || entry.path !== `lessons/${entry.id}.md` ||
        typeof entry.gitBlob !== 'string' || !/^[a-f0-9]{40}$/.test(entry.gitBlob) ||
        typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid source entry');
    ids.add(entry.id);
  }
  if (Object.keys(sources).sort().join(',') !== [...ids].sort().join(',')) throw new Error('Exact source coverage required');
  const readings = {};
  let total = 0;
  for (const entry of manifest.entries) {
    const source = sources[entry.id];
    if (!shape(source, 'path,text') || source.path !== entry.path || typeof source.text !== 'string' ||
        source.text.length > 32768 || Buffer.byteLength(source.text, 'utf8') > 32768) throw new Error('Source snapshot required');
    const bytes = Buffer.from(source.text, 'utf8'); total += bytes.length;
    const git = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (total > 262144 || git !== entry.gitBlob || hash('sha256', bytes) !== entry.sha256) throw new Error('Source identity mismatch');
    readings[entry.id] = splitReviewSource(source.text);
  }
  return Object.freeze(readings);
}
