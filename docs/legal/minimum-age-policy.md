# Selected certification enrollment age policy

Status: operator-selected requirement; not legal approval or enrollment activation.
Decision recorded: October 13, 2026.

Minimum enrollment age is 16. People under 16 may not register for certification enrollment. Learners aged 16 or older use their own agreement acknowledgment, comprehension check, and explicit owner approval. No separate parent or guardian approval step is selected.

This decision supersedes the undecided age threshold and guardian-process selection in the preparation draft and checklist. Those documents must be reconciled in the integration patch. The selected policy does not establish legal sufficiency for enrolling 16–17-year-olds; the outstanding legal-review requirement remains.

## Current implementation status
certification-age-eligibility.js is a standalone prerequisite. Its tests cover reported ages below 16, the exact 16 boundary, older ages, and malformed values. It is not yet imported by the backend or Discord submission handler, and does not yet block actual registrations. New tests require exact-head CI verification; no passing result is claimed when preparing this commit.

The helper validates a reported age in whole years. It does not establish identity or independently verify actual age. No date of birth, identity document, or parental record is collected or stored by this helper. Do not claim that self-report prevents false age declarations.

## Required integration before use
- Collect age eligibility in the authenticated learner flow without allowing another learner's identity to be supplied.
- Enforce eligibility in backend validation before database checkout or enrollment writes, not only in button display.
- Reject missing or invalid eligibility input and reported ages below 16.
- Bind any multi-step age action to the learner, guild, session expiry, and one-use submission rules.
- Review what minimal eligibility evidence must be persisted for owner review and how legacy requests are handled; retention remains undecided.
- Test backend no-write rejection, forged/replayed session actions, missing input, and the 16 boundary through the actual route.
- Reconcile agreement, checklist, existing fixtures, and approved consent/copy processes before activation.

This commit provisions no resources, changes no database schema or production settings, publishes no agreement or Discord message, and authorizes no merge, deployment, or activation.
