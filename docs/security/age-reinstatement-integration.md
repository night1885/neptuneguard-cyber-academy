# Current eligibility before reinstatement — branch safeguard

Readiness/restricted-role integration at 36610c1e7cb0f69c39d1b434aceb5176a4d5af5c passed unit and PostgreSQL 16/18 CI before this patch. New exact-head results are pending.

The access-management service used by the actual router now requires current self-reported age evidence before changing suspended or revoked enrollment back to approved. This check follows existing owner, state, prior-approval, permanent-ID, and acknowledgment checks inside the same row-locked transaction and precedes any mutation. Successful reinstatement records the trusted policy and self-report method in its audit details, preserves the ID, and does not restore lab authorization. No parental-consent step is added.

Suspension, revocation, and denial rules are unchanged; missing age evidence does not prevent safety-related access removal. Existing approved course access is not retroactively revoked or rewritten by this source change. No missing evidence is fabricated or backfilled.

Legacy suspended/revoked records without current evidence are blocked from reinstatement. The existing authenticated refresh path only supports matching pending records, so a supported restricted-state renewal process and its owner review remain unresolved before activation. Do not instruct owners to edit flags directly in the database or bypass the check.

Updated unit fixtures preserve previous authorization, prior-approval, acknowledgment, transition, audit-failure, ID, and lab-separation coverage. Added tests cover evidence rejection in both reinstatable states, trusted audit metadata, and access-removal behavior without evidence. The existing disposable restricted-role suite uses the updated service with the current writer's evidence and therefore exercises successful real PostgreSQL reinstatement; this patch does not add real database negative-evidence cases. Exact-head CI and further routed/negative-database/live verification remain required.

This safeguard is self-report enforcement, not independent age verification or a complete legacy-data policy. Retention/legal review, document reconciliation, target-environment checks, and controlled activation testing remain outstanding. No production migration, configuration change, access change, publication, merge, or deployment is performed or authorized by this commit.
