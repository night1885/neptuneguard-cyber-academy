-- Proposed only; review and apply separately after migrations 001–003.
-- Rows in certification_agreements represent published version snapshots.
BEGIN;
CREATE OR REPLACE FUNCTION certification_reject_agreement_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published agreement versions are immutable; insert a new version';
END;
$$;

DROP TRIGGER IF EXISTS certification_agreement_immutable ON certification_agreements;
CREATE TRIGGER certification_agreement_immutable
BEFORE UPDATE OR DELETE ON certification_agreements
FOR EACH ROW EXECUTE FUNCTION certification_reject_agreement_mutation();

DROP TRIGGER IF EXISTS certification_agreement_no_truncate ON certification_agreements;
CREATE TRIGGER certification_agreement_no_truncate
BEFORE TRUNCATE ON certification_agreements
FOR EACH STATEMENT EXECUTE FUNCTION certification_reject_agreement_mutation();
COMMIT;
