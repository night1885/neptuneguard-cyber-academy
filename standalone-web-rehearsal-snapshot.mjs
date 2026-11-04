import {readFile, realpath} from 'node:fs/promises';
import {resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {WEB_REHEARSAL_KEY, WEB_REHEARSAL_PAGES} from './standalone-web-rehearsal-core.mjs';
import {createBoundedWebRehearsal} from './standalone-web-rehearsal-lifecycle.mjs';
import {createWebReviewPostgresStore} from './standalone-web-rehearsal-postgres.mjs';

// Fixed authoring snapshot, not learner publication or a production course registration.
export const WEB_REHEARSAL_SNAPSHOT = Object.freeze([
  Object.freeze({key:'entry',path:'docs/formal-ethical-hacking/authoring/STANDALONE-WEB-W00-ENTRY.md',bytes:6841,sha256:'dd857f0288f6e6ef12aadf65537774f1be8804af3980eeaf5a954e7971fec418'}),
  Object.freeze({key:'http',path:'docs/formal-ethical-hacking/authoring/STANDALONE-WEB-W01-TEACHING.md',bytes:5511,sha256:'ed94bf6688e592a97419978dee97c7559750a97a91bb8080909ae6f3215a8cb2'})
]);
const digest = value => createHash('sha256').update(value).digest('hex');
export const WEB_REHEARSAL_CONTENT_REVISION = digest(JSON.stringify({format:1,courseKey:WEB_REHEARSAL_KEY,pages:WEB_REHEARSAL_SNAPSHOT}));
const fail = () => Error('Pinned review unavailable');

export function createPinnedWebRehearsal(config = {}, ports = {}) {
  if (config.enabled !== true) return Object.freeze({enabled:false});
  if (config.reviewOnly !== true || config.syntheticOnly !== true || config.disposableReview !== true ||
      Object.hasOwn(config,'contentRevision') || !(config.repositoryRoot instanceof URL) || config.repositoryRoot.protocol !== 'file:' ||
      WEB_REHEARSAL_PAGES.length !== WEB_REHEARSAL_SNAPSHOT.length || WEB_REHEARSAL_PAGES.some((p,n) => p.key !== WEB_REHEARSAL_SNAPSHOT[n].key || p.path !== WEB_REHEARSAL_SNAPSHOT[n].path) ||
      typeof ports.authorize !== 'function') throw fail();
  const rootURL = new URL(config.repositoryRoot.href), authorize = ports.authorize;
  let retired = false;
  async function loadPage(key) {
    try {
      const page = WEB_REHEARSAL_SNAPSHOT.find(p => p.key === key);
      if (!page) throw fail();
      const root = await realpath(fileURLToPath(rootURL));
      const path = await realpath(resolve(root,page.path)), child = relative(root,path);
      if (!child || child === '..' || child.startsWith('../') || child.startsWith('..\\') || isAbsolute(child)) throw fail();
      const bytes = await readFile(path);
      if (retired || bytes.length !== page.bytes || digest(bytes) !== page.sha256) throw fail();
      const text = bytes.toString('utf8');
      if (!Buffer.from(text,'utf8').equals(bytes)) throw fail();
      return text;
    } catch {throw fail();}
  }
  const progress = createWebReviewPostgresStore({enabled:true,reviewOnly:true,syntheticOnly:true,disposableReview:true,
    guildId:config.guildId,databaseName:config.databaseName,contentRevision:WEB_REHEARSAL_CONTENT_REVISION},ports.database);
  const app = createBoundedWebRehearsal({enabled:true,reviewOnly:true,syntheticOnly:true,
    providerMs:config.providerMs,drainMs:config.drainMs,maxOperations:config.maxOperations,maxInflight:config.maxInflight},{
    authorize:identity => authorize.call(ports,identity), loadPage,
    progress:{read:identity => progress.read(identity),async compareAndSet(identity,expected,pageKey) {
      await loadPage(pageKey);
      return progress.compareAndSet(identity,expected,pageKey);
    }}
  });
  return Object.freeze({enabled:true,contentRevision:WEB_REHEARSAL_CONTENT_REVISION,run:app.run,stop(){retired=true;return app.stop();}});
}
