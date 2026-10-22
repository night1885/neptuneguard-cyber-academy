-- Apply separately, after migrations 001-009 and database acceptance tests.
-- No backfill, learner approval, privilege grants, or runtime activation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE FUNCTION public.certification_valid_manual_review_snapshot(value jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
  SELECT CASE WHEN jsonb_typeof(value) IS DISTINCT FROM 'object' THEN false ELSE COALESCE(
    value->>'formatVersion' = 'manual-review-v1'
    AND jsonb_typeof(value->'checkVersion') = 'string'
    AND value->>'checkVersion' ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'
    AND CASE WHEN jsonb_typeof(value->'items') = 'array' THEN
      jsonb_array_length(value->'items') BETWEEN 1 AND 3
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(value->'items') AS entries(item)
        WHERE CASE WHEN jsonb_typeof(item) IS DISTINCT FROM 'object' THEN true ELSE
          jsonb_typeof(item->'question') IS DISTINCT FROM 'string'
          OR jsonb_typeof(item->'response') IS DISTINCT FROM 'string'
          OR jsonb_typeof(item->'expectedAnswer') IS DISTINCT FROM 'string'
          OR COALESCE(char_length(btrim(item->>'question', U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')),0) < 1
          OR char_length(item->>'question') > 300
          OR COALESCE(char_length(btrim(item->>'response', U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')),0) < 1
          OR char_length(item->>'response') > 100
          OR COALESCE(char_length(btrim(item->>'expectedAnswer', U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')),0) < 1
          OR char_length(item->>'expectedAnswer') > 100
          OR item - ARRAY['question','response','expectedAnswer']::text[] <> '{}'::jsonb
        END
      )
    ELSE false END
    AND value - ARRAY['formatVersion','checkVersion','items']::text[] = '{}'::jsonb,
    false
  ) END;
$function$;
ALTER TABLE public.certification_enrollments
  ADD COLUMN comprehension_submitted_at timestamptz,
  ADD COLUMN comprehension_review_snapshot jsonb;
ALTER TABLE public.certification_enrollments
  ADD CONSTRAINT certification_manual_review_snapshot_complete CHECK (
    (comprehension_submitted_at IS NULL AND comprehension_review_snapshot IS NULL)
    OR (comprehension_submitted_at IS NOT NULL AND comprehension_review_snapshot IS NOT NULL
      AND public.certification_valid_manual_review_snapshot(comprehension_review_snapshot)
      AND comprehension_check_version IS NOT NULL
      AND comprehension_review_snapshot->>'checkVersion' = comprehension_check_version
      AND comprehension_passed_at IS NULL)
  );
ALTER TABLE public.certification_enrollments
  DROP CONSTRAINT certification_account_acknowledgment_required,
  ADD CONSTRAINT certification_account_acknowledgment_required CHECK (
    signature_method IS DISTINCT FROM 'discord_account' OR (
      discord_user_id ~ '^[0-9]{17,20}$'
      AND acknowledgment_name IS NULL AND signature_reference IS NULL
      AND agreement_version IS NOT NULL AND char_length(agreement_version) BETWEEN 1 AND 100
      AND agreement_content_sha256 IS NOT NULL AND agreement_content_sha256 ~ '^[a-f0-9]{64}$'
      AND acknowledged_at IS NOT NULL AND learner_confirmed_read_at IS NOT NULL
      AND ((comprehension_passed_at IS NOT NULL AND comprehension_submitted_at IS NULL
          AND comprehension_review_snapshot IS NULL)
        OR (comprehension_passed_at IS NULL AND comprehension_submitted_at IS NOT NULL
          AND comprehension_review_snapshot IS NOT NULL
          AND public.certification_valid_manual_review_snapshot(comprehension_review_snapshot)
          AND comprehension_review_snapshot->>'checkVersion' = comprehension_check_version))
      AND comprehension_check_version IS NOT NULL AND char_length(comprehension_check_version) > 0
      AND age_eligible IS TRUE AND age_declared_at IS NOT NULL
      AND age_declaration_version IS NOT NULL AND age_declaration_version = 'adult-18-v1'
    )
  );
COMMENT ON COLUMN public.certification_enrollments.comprehension_submitted_at IS
  'Responses submitted for owner review; not comprehension passing or enrollment approval.';
COMMENT ON COLUMN public.certification_enrollments.comprehension_review_snapshot IS
  'Private submitted-time question, response and guide snapshot. Owner view only; never log or expose to learners.';
COMMIT;
