import {readFile, realpath} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// Rehearsal-only identity, not a registered production course.
export const WEB_REHEARSAL_KEY = 'standalone-web-review';
export const WEB_REHEARSAL_PAGES = Object.freeze([
  Object.freeze({key:'entry', path:'docs/formal-ethical-hacking/authoring/STANDALONE-WEB-W00-ENTRY.md'}),
  Object.freeze({key:'http', path:'docs/formal-ethical-hacking/authoring/STANDALONE-WEB-W01-TEACHING.md'})
]);
const validPage = key => WEB_REHEARSAL_PAGES.some(page => page.key === key);
const validActor = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const validRecord = row => row && validPage(row.pageKey) && Number.isSafeInteger(row.revision) && row.revision >= 1 && row.revision < Number.MAX_SAFE_INTEGER;
const unavailable = () => Object.freeze({outcome:'unavailable'});

export function createWebReviewLoader({repositoryRoot} = {}) {
  if (!(repositoryRoot instanceof URL) || repositoryRoot.protocol !== 'file:') throw Error('Trusted local root required');
  return async pageKey => {
    const page = WEB_REHEARSAL_PAGES.find(item => item.key === pageKey);
    if (!page) throw Error('Unavailable page');
    const root = await realpath(fileURLToPath(repositoryRoot));
    const path = await realpath(resolve(root, page.path));
    if (!path.startsWith(root + sep)) throw Error('Unavailable page');
    const text = await readFile(path, 'utf8');
    if (!text || Buffer.byteLength(text, 'utf8') > 65536) throw Error('Unavailable page');
    return text;
  };
}

export function createWebRehearsalCore(config = {}, ports = {}) {
  if (config.enabled !== true) return Object.freeze({enabled:false});
  if (config.reviewOnly !== true || config.syntheticOnly !== true) throw Error('Explicit synthetic review required');
  if (typeof ports.authorize !== 'function' || typeof ports.loadPage !== 'function' || typeof ports.progress?.read !== 'function' || typeof ports.progress?.compareAndSet !== 'function') throw Error('Reviewed providers required');
  let stopped = false;
  async function allowed(actorId) {
    if (stopped || !validActor(actorId)) return false;
    const result = await ports.authorize(Object.freeze({actorId, courseKey:WEB_REHEARSAL_KEY}));
    return !stopped && result?.actorId === actorId && result?.courseKey === WEB_REHEARSAL_KEY && result?.allowed === true;
  }
  async function run(request) {
    try {
      if (!request || typeof request !== 'object') return unavailable();
      const {actorId, courseKey, action, pageKey, expectedRevision} = request;
      if (courseKey !== WEB_REHEARSAL_KEY || !['open','read','save','resume'].includes(action)) return unavailable();
      if ((action === 'read' || action === 'save') && !validPage(pageKey)) return unavailable();
      if (action === 'save' && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER - 1)) return unavailable();
      if (!await allowed(actorId)) return unavailable();
      const identity = Object.freeze({actorId, courseKey:WEB_REHEARSAL_KEY});
      if (action === 'save') {
        if (!await allowed(actorId)) return unavailable();
        const result = await ports.progress.compareAndSet(identity, expectedRevision, pageKey);
        if (!await allowed(actorId)) return unavailable();
        if (result?.outcome === 'conflict') return Object.freeze({outcome:'conflict'});
        if (result?.outcome !== 'saved' || result.revision !== expectedRevision + 1) return unavailable();
        return Object.freeze({outcome:'saved', revision:result.revision});
      }
      let selected = action === 'read' ? pageKey : 'entry';
      let revision = null;
      if (action === 'resume') {
        const saved = await ports.progress.read(identity);
        if (saved !== null) {
          if (!validRecord(saved)) return unavailable();
          selected = saved.pageKey;
          revision = saved.revision;
        }
      }
      if (!await allowed(actorId)) return unavailable();
      const content = await ports.loadPage(selected);
      if (typeof content !== 'string' || !content || Buffer.byteLength(content, 'utf8') > 65536 || !await allowed(actorId)) return unavailable();
      return Object.freeze({outcome:'page', pageKey:selected, revision, content});
    } catch { return unavailable(); }
  }
  return Object.freeze({enabled:true, run, stop(){stopped = true;}});
}
