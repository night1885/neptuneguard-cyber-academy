const COURSE = 'standalone-web-review';
const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const page = value => value === 'entry' || value === 'http';
const revision = value => Number.isSafeInteger(value) && value >= 0 && value < Number.MAX_SAFE_INTEGER - 1;
const fail = () => Error('Review progress unavailable');
function storedRevision(value) {
  if (typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value)) value = Number(value);
  if (!Number.isSafeInteger(value) || value < 1 || value >= Number.MAX_SAFE_INTEGER) throw fail();
  return value;
}

export function createWebReviewPostgresStore(config = {}, database = {}) {
  if (config.enabled !== true) return Object.freeze({enabled:false});
  const {guildId, contentRevision, databaseName} = config;
  if (config.reviewOnly !== true || config.syntheticOnly !== true || config.disposableReview !== true || !id(guildId) || typeof contentRevision !== 'string' || !/^[a-f0-9]{64}$/.test(contentRevision) || typeof databaseName !== 'string' || !/^ng_web_review_[a-z0-9_]{1,30}$/.test(databaseName) || typeof database.query !== 'function') throw Error('Explicit disposable database profile required');
  function identity(value) {
    if (!value || !id(value.actorId) || value.courseKey !== COURSE) throw fail();
    return [guildId, value.actorId, COURSE, contentRevision];
  }
  async function query(text, values) {
    try {
      const result = await database.query(text, values);
      if (!Array.isArray(result?.rows) || result.rows.length > 1) throw fail();
      return result.rows;
    } catch {throw fail();}
  }
  async function inspect() {
    const rows = await query('SELECT current_database() AS database_name', []);
    if (rows.length !== 1 || rows[0]?.database_name !== databaseName) throw fail();
  }
  return Object.freeze({enabled:true,
    async read(subject) {
      const values = identity(subject);
      await inspect();
      const rows = await query('SELECT page_key, revision FROM web_review_progress.bookmarks WHERE guild_id=$1 AND actor_id=$2 AND course_key=$3 AND content_revision=$4', values);
      if (!rows.length) return null;
      if (!page(rows[0]?.page_key)) throw fail();
      return Object.freeze({pageKey:rows[0].page_key, revision:storedRevision(rows[0].revision)});
    },
    async compareAndSet(subject, expectedRevision, pageKey) {
      const values = identity(subject);
      if (!revision(expectedRevision) || !page(pageKey)) throw fail();
      await inspect();
      const rows = expectedRevision === 0
        ? await query('INSERT INTO web_review_progress.bookmarks (guild_id,actor_id,course_key,content_revision,page_key,revision) VALUES ($1,$2,$3,$4,$5,1) ON CONFLICT (guild_id,actor_id,course_key,content_revision) DO NOTHING RETURNING revision', [...values,pageKey])
        : await query('UPDATE web_review_progress.bookmarks SET page_key=$5, revision=revision+1 WHERE guild_id=$1 AND actor_id=$2 AND course_key=$3 AND content_revision=$4 AND revision=$6 RETURNING revision', [...values,pageKey,expectedRevision]);
      if (!rows.length) return Object.freeze({outcome:'conflict'});
      const next = storedRevision(rows[0]?.revision);
      if (next !== expectedRevision + 1) throw fail();
      return Object.freeze({outcome:'saved', revision:next});
    }
  });
}
