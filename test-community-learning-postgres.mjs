import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { verifyCommunityDatabase } from './community-learning-readiness.mjs';
import { createCommunityRouter } from './community-learning-router.mjs';
import { createNativeCommunityClassroom, communityBadgeKeys } from './community-learning-native.mjs';
import { buildBadgePage } from './badge-pages.js';
const enabled = process.env.COMMUNITY_PG_DISPOSABLE === 'true';
test('disposable PostgreSQL: restricted login, real router/classroom, preserved history and idempotent awards', { skip: !enabled, timeout: 90000 }, async () => {
  const url = new URL(process.env.COMMUNITY_PG_ADMIN_URL || '');
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  assert.equal(url.pathname, '/community_acceptance'); assert.equal(url.username, 'postgres');
  assert.equal(url.search, ''); assert.equal(url.hash, '');
  const admin = new pg.Pool({ connectionString: url.toString(), ssl: false, max: 2 });
  let pool;
  try {
    const identity = await admin.query('SELECT current_database() AS database, session_user AS login');
    assert.deepEqual(identity.rows[0], { database: 'community_acceptance', login: 'postgres' });
    await admin.query(`CREATE ROLE academy_community_learning LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS PASSWORD 'fixture-community-only';
      REVOKE ALL ON DATABASE community_acceptance FROM PUBLIC;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      CREATE TABLE public.learner_profiles (discord_user_id TEXT PRIMARY KEY,current_path_slug TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),total_xp INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE public.learner_module_progress (discord_user_id TEXT NOT NULL,course_key TEXT NOT NULL,module_number INTEGER NOT NULL,lesson_completed BOOLEAN NOT NULL DEFAULT FALSE,lab_completed BOOLEAN NOT NULL DEFAULT FALSE,quiz_completed BOOLEAN NOT NULL DEFAULT FALSE,quiz_score INTEGER NOT NULL DEFAULT 0,xp_earned INTEGER NOT NULL DEFAULT 0,completed_at TIMESTAMPTZ,PRIMARY KEY(discord_user_id,course_key,module_number));
      CREATE TABLE public.learner_badges (discord_user_id TEXT NOT NULL,badge_key TEXT NOT NULL,badge_name TEXT NOT NULL,earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(discord_user_id,badge_key));
      CREATE TABLE public.certification_fixture (id INTEGER PRIMARY KEY,note TEXT NOT NULL);
      INSERT INTO public.certification_fixture VALUES (1,'untouched formal-course sentinel');
      GRANT CONNECT ON DATABASE community_acceptance TO academy_community_learning;
      GRANT USAGE ON SCHEMA public TO academy_community_learning;
      GRANT SELECT,INSERT,UPDATE ON public.learner_profiles,public.learner_module_progress TO academy_community_learning;
      GRANT SELECT,INSERT ON public.learner_badges TO academy_community_learning;`);
    const login = new URL(url); login.username = 'academy_community_learning'; login.password = 'fixture-community-only';
    pool = new pg.Pool({ connectionString: login.toString(), ssl: false, max: 2, options: '-c search_path=pg_catalog,public,pg_temp -c statement_timeout=5000 -c lock_timeout=2000 -c idle_in_transaction_session_timeout=10000' });
    assert.deepEqual(await verifyCommunityDatabase(pool,'community_acceptance'), { ready: true });
    await assert.rejects(pool.query('SELECT * FROM public.certification_fixture'), { code: '42501' });
    await admin.query('GRANT SELECT ON public.certification_fixture TO academy_community_learning');
    await assert.rejects(verifyCommunityDatabase(pool,'community_acceptance'));
    await admin.query('REVOKE SELECT ON public.certification_fixture FROM academy_community_learning');
    await admin.query('GRANT UPDATE ON public.learner_badges TO academy_community_learning');
    await assert.rejects(verifyCommunityDatabase(pool,'community_acceptance'));
    await admin.query('REVOKE UPDATE ON public.learner_badges FROM academy_community_learning');
    await admin.query('CREATE ROLE community_fixture_extra NOLOGIN; GRANT community_fixture_extra TO academy_community_learning');
    await assert.rejects(verifyCommunityDatabase(pool,'community_acceptance'));
    await admin.query('REVOKE community_fixture_extra FROM academy_community_learning');
    assert.deepEqual(await verifyCommunityDatabase(pool,'community_acceptance'), { ready: true });
    const actor = '333333333333333333', guildId = '111111111111111111', role = '222222222222222222';
    await admin.query(`INSERT INTO public.learner_profiles(discord_user_id,current_path_slug,total_xp) VALUES ($1,'soc-analyst',777)`, [actor]);
    await admin.query(`INSERT INTO public.learner_module_progress(discord_user_id,course_key,module_number,xp_earned) VALUES ($1,'soc-analyst',1,50)`, [actor]);
    await admin.query(`INSERT INTO public.learner_badges(discord_user_id,badge_key,badge_name) VALUES ($1,'historical-soc-fixture-only','Historical SOC Fixture')`, [actor]);
    let verified = true;
    const route = createCommunityRouter({ pool, options: { enabled: true,guildId,verifiedRoleId: role }, ready: () => true,
      ...createNativeCommunityClassroom(), renderBadges: buildBadgePage, badgeKeys: communityBadgeKeys });
    async function run(command, { button, path = 'linux-fundamentals', server = guildId } = {}) {
      const replies = [], i = { commandName: command,customId: button,guildId: server,user: { id: actor },
        isChatInputCommand: () => button === undefined,isButton: () => button !== undefined,options: { getString: () => path },
        guild: { id: server,members: { async fetch(request) { assert.deepEqual(request,{ user: actor,force: true }); return { id: actor,roles: { cache: { has: value => value === role && verified } } }; } } },
        async deferReply(payload) { assert.equal(payload.flags,64); },async editReply(payload) { replies.push(payload); } };
      const handled = await route(i); return { handled,replies };
    }
    const profile = async () => (await admin.query('SELECT current_path_slug,total_xp FROM public.learner_profiles WHERE discord_user_id=$1',[actor])).rows[0];
    await run('continue'); assert.equal((await profile()).current_path_slug,'soc-analyst');
    await run('begin',{ path: 'soc-analyst' }); assert.equal((await profile()).current_path_slug,'soc-analyst');
    verified = false; await run('begin'); assert.equal((await profile()).current_path_slug,'soc-analyst');
    verified = true; await run('begin',{ server: null }); assert.equal((await profile()).current_path_slug,'soc-analyst');
    await run('begin'); assert.deepEqual(await profile(),{ current_path_slug: 'linux-fundamentals',total_xp: 777 });
    await run('start'); assert.equal((await profile()).total_xp,777);
    const opened = await run('continue'); assert.ok(opened.replies[0].embeds[0].title.includes('Linux Fundamentals'));
    await run(null,{ button: 'academy:linux-fundamentals:2:lesson-complete' });
    assert.equal((await admin.query(`SELECT COUNT(*)::int AS count FROM public.learner_module_progress WHERE discord_user_id=$1 AND course_key='linux-fundamentals'`,[actor])).rows[0].count,0);
    for (const action of ['lesson:0','lab:0','quiz','answer-a']) await run(null,{ button: 'academy:linux-fundamentals:1:' + action });
    assert.equal((await profile()).total_xp,777);
    for (const action of ['lesson-complete','lab-complete','answer-b']) await run(null,{ button: 'academy:linux-fundamentals:1:' + action });
    assert.equal((await profile()).total_xp,877);
    await Promise.all([run(null,{ button: 'academy:linux-fundamentals:1:answer-b' }),run(null,{ button: 'academy:linux-fundamentals:1:answer-b' })]);
    assert.equal((await profile()).total_xp,877);
    const progress = (await admin.query(`SELECT xp_earned,lesson_completed,lab_completed,quiz_completed,completed_at FROM public.learner_module_progress WHERE discord_user_id=$1 AND course_key='linux-fundamentals' AND module_number=1`,[actor])).rows[0];
    assert.equal(progress.xp_earned,100); assert.equal(progress.lesson_completed,true); assert.equal(progress.lab_completed,true); assert.equal(progress.quiz_completed,true); assert.ok(progress.completed_at);
    assert.equal((await admin.query(`SELECT COUNT(*)::int AS count FROM public.learner_badges WHERE discord_user_id=$1 AND badge_key='linux-foundations'`,[actor])).rows[0].count,1);
    const report = JSON.stringify((await run('progress')).replies); assert.ok(report.includes('100 community XP')); assert.ok(!report.includes('soc-analyst'));
    const badges = JSON.stringify((await run('badges')).replies); assert.ok(badges.includes('Linux Foundations')); assert.ok(!badges.includes('Historical SOC Fixture'));
    assert.equal((await admin.query(`SELECT xp_earned FROM public.learner_module_progress WHERE discord_user_id=$1 AND course_key='soc-analyst'`,[actor])).rows[0].xp_earned,50);
    const before = await profile(); verified = false; await run(null,{ button: 'academy:linux-fundamentals:2:lesson-complete' }); assert.deepEqual(await profile(),before);
    verified = true; await run(null,{ button: 'academy:soc-analyst:1:lesson-complete' }); assert.deepEqual(await profile(),before);
    assert.equal((await run(null,{ button: 'cert:initial:home' })).handled,false);
    assert.deepEqual((await admin.query('SELECT * FROM public.certification_fixture')).rows,[{ id: 1,note: 'untouched formal-course sentinel' }]);
  } finally { if (pool) await pool.end(); await admin.end(); }
});
