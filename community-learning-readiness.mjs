const names = ['learner_profiles', 'learner_module_progress', 'learner_badges'];
const expected = {
  learner_profiles: { discord_user_id: 'text', current_path_slug: 'text', created_at: 'timestamp with time zone', last_activity_at: 'timestamp with time zone', total_xp: 'integer' },
  learner_module_progress: { discord_user_id: 'text', course_key: 'text', module_number: 'integer', lesson_completed: 'boolean', lab_completed: 'boolean', quiz_completed: 'boolean', quiz_score: 'integer', xp_earned: 'integer', completed_at: 'timestamp with time zone' },
  learner_badges: { discord_user_id: 'text', badge_key: 'text', badge_name: 'text', earned_at: 'timestamp with time zone' }
};
const primary = { learner_profiles: ['discord_user_id'], learner_module_progress: ['discord_user_id', 'course_key', 'module_number'], learner_badges: ['discord_user_id', 'badge_key'] };
export async function verifyCommunityDatabase(pool, database) {
  if (typeof pool?.query !== 'function' || typeof database !== 'string' || !database) throw new Error('Explicit community database identity required');
  const { rows } = await pool.query(`SELECT current_database() AS database, current_user AS actor, session_user AS login,
    current_setting('search_path') AS search_path,
    (SELECT jsonb_build_object('login',rolcanlogin,'super',rolsuper,'create_role',rolcreaterole,'create_db',rolcreatedb,'replication',rolreplication,'bypass',rolbypassrls,'inherit',rolinherit) FROM pg_roles WHERE rolname=current_user) AS role,
    (SELECT count(*)::int FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS memberships,
    has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
    (SELECT count(*)::int FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname<>'information_schema' AND has_schema_privilege(current_user,oid,'CREATE')) AS writable_schemas,
    (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND c.relkind IN ('r','p','v','m','f') AND NOT (n.nspname='public' AND c.relname=ANY($1::text[])) AND has_table_privilege(current_user,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS outside_tables,
    (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND p.prosecdef AND has_function_privilege(current_user,p.oid,'EXECUTE')) AS executable_definers,
    (SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forced_rls',c.relforcerowsecurity,
      'select',has_table_privilege(current_user,c.oid,'SELECT'),'insert',has_table_privilege(current_user,c.oid,'INSERT'),'update',has_table_privilege(current_user,c.oid,'UPDATE'),
      'excess',has_table_privilege(current_user,c.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER'),
      'triggers',(SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
      'columns',(SELECT jsonb_object_agg(column_name,data_type) FROM information_schema.columns WHERE table_schema='public' AND table_name=c.relname),
      'primary_key',(SELECT jsonb_agg(a.attname ORDER BY k.ordinality) FROM pg_constraint p CROSS JOIN LATERAL unnest(p.conkey) WITH ORDINALITY k(attnum,ordinality) JOIN pg_attribute a ON a.attrelid=p.conrelid AND a.attnum=k.attnum WHERE p.conrelid=c.oid AND p.contype='p')))
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[])) AS tables`, [names]);
  const data = rows?.length === 1 && rows[0], role = data?.role;
  if (!data || data.database !== database || data.actor !== 'academy_community_learning' || data.login !== data.actor ||
      String(data.search_path).replace(/\s/g,'') !== 'pg_catalog,public,pg_temp' || role?.login !== true ||
      ['super','create_role','create_db','replication','bypass','inherit'].some(key => role[key] !== false) ||
      data.database_create !== false || ['memberships','writable_schemas','outside_tables','executable_definers'].some(key => data[key] !== 0) ||
      !Array.isArray(data.tables) || data.tables.length !== names.length) throw new Error('Community database identity or privilege checks failed');
  for (const name of names) {
    const table = data.tables.find(t => t.name === name);
    if (!table || table.kind !== 'r' || table.rls !== false || table.forced_rls !== false || table.select !== true || table.insert !== true ||
        table.update !== (name !== 'learner_badges') || table.excess !== false || table.triggers !== 0 ||
        JSON.stringify(table.primary_key) !== JSON.stringify(primary[name]) || Object.entries(expected[name]).some(([column,type]) => table.columns?.[column] !== type)) throw new Error('Community progress schema or capabilities are not ready');
  }
  return Object.freeze({ ready: true });
}
