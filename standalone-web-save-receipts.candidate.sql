-- LOCAL REVIEW CANDIDATE ONLY. Not installed, parsed by a PostgreSQL server, or runtime-wired.
-- Installation is deliberately limited to the explicit disposable CI owner/database/worker.
-- Creates no database, role, password or connection; only the named CI worker receives function grants.
BEGIN;
DO $guard$
BEGIN
  IF current_database()<>'ng_web_review_ci' OR current_user<>'web_review_ci_owner'
     OR current_user<>session_user OR current_setting('server_version_num')::integer<160000 THEN
    RAISE EXCEPTION 'Explicit disposable CI owner required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='web_receipt_ci_worker'
      AND NOT(rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
     OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='web_receipt_ci_worker'))
     OR has_database_privilege('web_receipt_ci_worker',current_database(),'CREATE') THEN
    RAISE EXCEPTION 'Explicit isolated receipt worker required';
  END IF;
END;
$guard$;
CREATE SCHEMA web_review_receipt_candidate;
REVOKE ALL ON SCHEMA web_review_receipt_candidate FROM PUBLIC;

CREATE TABLE web_review_receipt_candidate.scopes(
  guild_id text NOT NULL CHECK(guild_id~'^[0-9]{17,20}$'),
  actor_id text NOT NULL CHECK(actor_id~'^[0-9]{17,20}$'),
  course_key text NOT NULL CHECK(course_key='standalone-web-review'),
  content_revision text NOT NULL CHECK(content_revision~'^[a-f0-9]{64}$'),
  generation bigint NOT NULL CHECK(generation BETWEEN 1 AND 9007199254740990),
  active boolean NOT NULL,
  valid_until timestamptz NOT NULL CHECK(isfinite(valid_until)),
  max_receipts integer NOT NULL CHECK(max_receipts BETWEEN 1 AND 64),
  PRIMARY KEY(guild_id,actor_id,course_key,content_revision)
);
CREATE TABLE web_review_receipt_candidate.bookmarks(
  guild_id text NOT NULL,actor_id text NOT NULL,course_key text NOT NULL,content_revision text NOT NULL,
  generation bigint NOT NULL CHECK(generation BETWEEN 1 AND 9007199254740990),
  page_key text NOT NULL CHECK(page_key IN('entry','http')),
  revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740990),
  PRIMARY KEY(guild_id,actor_id,course_key,content_revision,generation),
  FOREIGN KEY(guild_id,actor_id,course_key,content_revision)
    REFERENCES web_review_receipt_candidate.scopes(guild_id,actor_id,course_key,content_revision)
);
CREATE TABLE web_review_receipt_candidate.receipts(
  guild_id text NOT NULL,actor_id text NOT NULL,course_key text NOT NULL,content_revision text NOT NULL,
  generation bigint NOT NULL CHECK(generation BETWEEN 1 AND 9007199254740990),
  operation_id uuid NOT NULL,
  expected_revision bigint NOT NULL CHECK(expected_revision BETWEEN 0 AND 9007199254740989),
  page_key text NOT NULL CHECK(page_key IN('entry','http')),
  outcome text NOT NULL CHECK(outcome IN('saved','conflict')),
  result_revision bigint,
  PRIMARY KEY(guild_id,actor_id,course_key,content_revision,generation,operation_id),
  FOREIGN KEY(guild_id,actor_id,course_key,content_revision)
    REFERENCES web_review_receipt_candidate.scopes(guild_id,actor_id,course_key,content_revision),
  CHECK((outcome='saved' AND result_revision IS NOT NULL AND result_revision=expected_revision+1)
     OR (outcome='conflict' AND result_revision IS NULL))
);

CREATE FUNCTION web_review_receipt_candidate.scope_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Fence must be retained';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NOT isfinite(NEW.valid_until) OR NEW.valid_until<=clock_timestamp() THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Finite future fixture grant required';
    END IF;
  ELSE
    IF ROW(NEW.guild_id,NEW.actor_id,NEW.course_key,NEW.content_revision)
       IS DISTINCT FROM ROW(OLD.guild_id,OLD.actor_id,OLD.course_key,OLD.content_revision)
       OR NEW.generation<OLD.generation THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Fence cannot move backwards';
    END IF;
    IF NEW.generation=OLD.generation THEN
      IF NEW.valid_until>OLD.valid_until OR (NOT OLD.active AND NEW.active)
         OR NEW.max_receipts<>OLD.max_receipts THEN
        RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='New generation required';
      END IF;
    ELSIF NOT isfinite(NEW.valid_until) OR NEW.valid_until<=clock_timestamp() THEN
      RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Finite future fixture grant required';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER preserve_scope_fence BEFORE INSERT OR UPDATE OR DELETE
ON web_review_receipt_candidate.scopes FOR EACH ROW
EXECUTE FUNCTION web_review_receipt_candidate.scope_guard();

CREATE FUNCTION web_review_receipt_candidate.refuse_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Immutable metadata or retained fence';
END;
$fn$;
CREATE TRIGGER immutable_receipt BEFORE UPDATE ON web_review_receipt_candidate.receipts
FOR EACH ROW EXECUTE FUNCTION web_review_receipt_candidate.refuse_change();
CREATE TRIGGER no_scope_truncate BEFORE TRUNCATE ON web_review_receipt_candidate.scopes
FOR EACH STATEMENT EXECUTE FUNCTION web_review_receipt_candidate.refuse_change();
CREATE TRIGGER no_bookmark_truncate BEFORE TRUNCATE ON web_review_receipt_candidate.bookmarks
FOR EACH STATEMENT EXECUTE FUNCTION web_review_receipt_candidate.refuse_change();
CREATE TRIGGER no_receipt_truncate BEFORE TRUNCATE ON web_review_receipt_candidate.receipts
FOR EACH STATEMENT EXECUTE FUNCTION web_review_receipt_candidate.refuse_change();

CREATE FUNCTION web_review_receipt_candidate.guard_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
DECLARE s web_review_receipt_candidate.scopes%ROWTYPE;
BEGIN
  SELECT * INTO s FROM web_review_receipt_candidate.scopes
  WHERE guild_id=OLD.guild_id AND actor_id=OLD.actor_id AND course_key=OLD.course_key
    AND content_revision=OLD.content_revision FOR SHARE;
  IF FOUND AND (OLD.generation<s.generation OR
      (OLD.generation=s.generation AND NOT s.active)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Live request metadata must be retained';
END;
$fn$;
CREATE TRIGGER guard_receipt_delete BEFORE DELETE ON web_review_receipt_candidate.receipts
FOR EACH ROW EXECUTE FUNCTION web_review_receipt_candidate.guard_delete();
CREATE TRIGGER guard_bookmark_delete BEFORE DELETE ON web_review_receipt_candidate.bookmarks
FOR EACH ROW EXECUTE FUNCTION web_review_receipt_candidate.guard_delete();

CREATE FUNCTION web_review_receipt_candidate.contract() RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp
AS 'SELECT 1';
CREATE FUNCTION web_review_receipt_candidate.receipt_json(p web_review_receipt_candidate.receipts)
RETURNS jsonb LANGUAGE sql STABLE
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
  SELECT jsonb_build_object('guildId',(p).guild_id,'actorId',(p).actor_id,
    'courseKey',(p).course_key,'contentRevision',(p).content_revision,
    'generation',(p).generation,'operationId',(p).operation_id,
    'expectedRevision',(p).expected_revision,'pageKey',(p).page_key,
    'outcome',(p).outcome,'resultRevision',(p).result_revision);
$fn$;

CREATE FUNCTION web_review_receipt_candidate.record_save(
  p_guild text,p_actor text,p_course text,p_content text,p_generation bigint,
  p_operation uuid,p_expected bigint,p_page text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
DECLARE s web_review_receipt_candidate.scopes%ROWTYPE;
  r web_review_receipt_candidate.receipts%ROWTYPE;
  b web_review_receipt_candidate.bookmarks%ROWTYPE;
  at timestamptz;current_revision bigint;result_revision bigint;result_outcome text;n integer;
BEGIN
  IF p_operation IS NULL OR p_generation IS NULL OR p_generation<1 OR p_expected IS NULL
     OR p_expected<0 OR p_expected>=9007199254740990 OR p_page IS NULL
     OR p_page NOT IN('entry','http') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';
  END IF;
  SELECT * INTO s FROM web_review_receipt_candidate.scopes
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course
    AND content_revision=p_content FOR UPDATE;
  at:=clock_timestamp();
  IF NOT FOUND OR s.active IS DISTINCT FROM true OR p_generation IS DISTINCT FROM s.generation
     OR at>=s.valid_until THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';
  END IF;
  SELECT * INTO r FROM web_review_receipt_candidate.receipts
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content
    AND generation=p_generation AND operation_id=p_operation;
  IF FOUND THEN
    IF r.expected_revision IS DISTINCT FROM p_expected OR r.page_key IS DISTINCT FROM p_page THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Operation binding conflict';
    END IF;
    RETURN web_review_receipt_candidate.receipt_json(r);
  END IF;
  IF (SELECT count(*) FROM web_review_receipt_candidate.receipts
      WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content)>=s.max_receipts THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Capacity unavailable';
  END IF;
  SELECT * INTO b FROM web_review_receipt_candidate.bookmarks
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content
    AND generation=p_generation FOR UPDATE;
  current_revision:=coalesce(b.revision,0);
  result_revision:=NULL;
  IF current_revision=p_expected THEN
    result_outcome:='saved';result_revision:=current_revision+1;
    IF current_revision=0 THEN
      INSERT INTO web_review_receipt_candidate.bookmarks
        (guild_id,actor_id,course_key,content_revision,generation,page_key,revision)
      VALUES(p_guild,p_actor,p_course,p_content,p_generation,p_page,result_revision);
    ELSE
      UPDATE web_review_receipt_candidate.bookmarks SET page_key=p_page,revision=result_revision
      WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content
        AND generation=p_generation AND revision=current_revision;
      GET DIAGNOSTICS n=ROW_COUNT;
      IF n<>1 THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Unavailable';END IF;
    END IF;
  ELSE
    result_outcome:='conflict';
  END IF;
  INSERT INTO web_review_receipt_candidate.receipts
    (guild_id,actor_id,course_key,content_revision,generation,operation_id,expected_revision,page_key,outcome,result_revision)
  VALUES(p_guild,p_actor,p_course,p_content,p_generation,p_operation,p_expected,p_page,result_outcome,result_revision)
  RETURNING * INTO r;
  RETURN web_review_receipt_candidate.receipt_json(r);
END;
$fn$;

CREATE FUNCTION web_review_receipt_candidate.read_receipt(
  p_guild text,p_actor text,p_course text,p_content text,p_generation bigint,p_operation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
DECLARE s web_review_receipt_candidate.scopes%ROWTYPE;
  r web_review_receipt_candidate.receipts%ROWTYPE;at timestamptz;
BEGIN
  SELECT * INTO s FROM web_review_receipt_candidate.scopes
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content FOR SHARE;
  at:=clock_timestamp();
  IF NOT FOUND OR s.active IS DISTINCT FROM true OR p_generation IS DISTINCT FROM s.generation
     OR at>=s.valid_until OR p_operation IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';
  END IF;
  SELECT * INTO r FROM web_review_receipt_candidate.receipts
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content
    AND generation=p_generation AND operation_id=p_operation;
  IF NOT FOUND THEN RETURN NULL;END IF;
  -- NULL means no visible receipt, not proof of no pending or late original request.
  RETURN web_review_receipt_candidate.receipt_json(r);
END;
$fn$;

CREATE FUNCTION web_review_receipt_candidate.prune_retired(
  p_guild text,p_actor text,p_course text,p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,web_review_receipt_candidate,pg_temp AS $fn$
DECLARE s web_review_receipt_candidate.scopes%ROWTYPE;at timestamptz;nr integer;nb integer;
BEGIN
  SELECT * INTO s FROM web_review_receipt_candidate.scopes
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unavailable';END IF;
  at:=clock_timestamp();
  IF s.active AND at>=s.valid_until THEN
    -- Retire durably before forgetting a current-generation receipt or bookmark.
    -- A later clock correction cannot reactivate this generation through ordinary UPDATE.
    UPDATE web_review_receipt_candidate.scopes SET active=false
    WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content;
    s.active:=false;
  END IF;
  DELETE FROM web_review_receipt_candidate.receipts
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content
    AND (generation<s.generation OR (generation=s.generation AND NOT s.active));
  GET DIAGNOSTICS nr=ROW_COUNT;
  DELETE FROM web_review_receipt_candidate.bookmarks
  WHERE guild_id=p_guild AND actor_id=p_actor AND course_key=p_course AND content_revision=p_content
    AND (generation<s.generation OR (generation=s.generation AND NOT s.active));
  GET DIAGNOSTICS nb=ROW_COUNT;
  RETURN jsonb_build_object('receiptsRemoved',nr,'bookmarksRemoved',nb,'scopeFenceRetained',true);
END;
$fn$;

REVOKE ALL ON ALL TABLES IN SCHEMA web_review_receipt_candidate FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA web_review_receipt_candidate FROM PUBLIC;
GRANT USAGE ON SCHEMA web_review_receipt_candidate TO web_receipt_ci_worker;
GRANT EXECUTE ON FUNCTION web_review_receipt_candidate.contract(),
  web_review_receipt_candidate.record_save(text,text,text,text,bigint,uuid,bigint,text),
  web_review_receipt_candidate.read_receipt(text,text,text,text,bigint,uuid)
TO web_receipt_ci_worker;
-- prune_retired and trigger/projection helpers receive no worker EXECUTE grant.
-- Scopes are owner-controlled; no seed, default grant, automatic pruning or existing-data migration.
COMMIT;
