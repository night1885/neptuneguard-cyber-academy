# Restricted-state eligibility renewal — connected in branch source

The backend prerequisite 115f562440b1517f2b7d538fba4ccd4d8731e006 passed unit and PostgreSQL 16/18 CI before this routing patch. Those database jobs did not exercise real renewal transactions; new exact-head routing results are pending.

cert:submit:renew now starts the existing authenticated agreement/form session in server-stored renewal mode. Registration and renewal share actor/guild binding, agreement/check snapshots, page/form sequence, expiry/restart invalidation, one-use send tokens, private replies, and the existing attempt lock/start-send budgets and response deadline. Learner form fields cannot switch the session mode or select another learner's identity. Both existing feature gates and the approved manifest remain required.

A renewal form calls renewEligibility using interaction.user.id, validates READ plus reported age and comprehension, and reports the unchanged restricted status with no restored access. The backend still requires matching prior approval/acknowledgment and changes only minimal evidence. Changed terms or incomplete legacy records require owner review. Owner reinstatement remains a separate action.

Eight new mocked tests exercise the actual router/guard/handler/backend for private renewal, identity/guild rejection, replay, invalid age, shared start limits, disabled/unsupported contexts, mode binding, and restart invalidation. Existing registration tests remain. These do not prove real Discord transport or PostgreSQL concurrency/rollback for renewal. Expiry/deadline-specific renewal tests, real database/restricted-role renewal coverage, and private owner renewal visibility remain follow-up work.

No renewal entry message or button is published by changing source. No production migration, configuration activation, access restoration, merge, or deployment is performed or authorized. Controlled live testing, retention/legal decisions, and agreement/checklist reconciliation remain required before activation.
