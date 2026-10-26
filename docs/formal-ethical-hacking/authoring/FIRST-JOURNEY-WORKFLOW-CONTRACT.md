# First-journey private workflow — proposed contract

Draft architecture-neutral requirements for future implementation. Not a live API, permission grant, database schema or configured collection system. Read the [integration inspection](WORKFLOW-INTEGRATION-REVIEW.md) first. Platform selection, identity adapters, retention/access policy and deployment approval remain unresolved.

## Independent decisions
Keep academy enrollment, selected-course assignment, restricted-exercise authorization, evidence review and formal awards as separate decisions. Reading a page, running a fixture, submitting evidence or receiving reviewer feedback never automatically grants another decision. A local prerequisite graph is planning metadata, not enforcement.

## Trusted context
The implementation must establish the current authenticated actor, configured workspace/server, selected course and current authoritative assignment. For practical work, separately check the approved exercise scope and any required lab authorization. Do not trust owner IDs, course roles, reviewer assignment, status or completion claims merely because they appear in a client payload.

A reviewer requires explicit current authority over the relevant course/record. Generic instructor role or access to an administrative view must not imply permission to view every learner's evidence. Recheck applicable authorization at each protected read/write and handle revocation during an operation before publishing a protected response. Exact transaction and external-identity consistency guarantees require implementation-specific review.

## Proposed review lifecycle, not automatic course progress
- working: learner-owned work is being prepared in the approved private workflow.
- submitted: a specific revision was submitted and is awaiting authorized review.
- changes-requested: an authorized reviewer recorded bounded feedback for that submitted revision.
- review-recorded: an authorized reviewer completed the review of that revision. This is not an award, independent competency certification or broad testing permission.

These proposed labels are not runtime states in the current application and are not added to the home-lab manifest. No numeric pass mark or automatic progression follows. Editing/resubmission rules, supported feedback and withdrawal/retention handling require the approved policy and implementation contract.

## Minimum record boundary to design
Use a server-generated record identifier and authoritative learner/course/exercise linkage, an explicit revision and lifecycle state, and bounded references to approved evidence and review records. This describes concepts, not approved field names or a migration. Minimize identifiers, avoid duplicate personal information and collect no credentials, unrelated device reports or protected instructor answers.

Define permitted evidence formats, maximum lengths/sizes, storage and retrieval rules, redaction handling, retention/deletion and authorized reviewer visibility before accepting any upload or text. Do not fetch arbitrary learner-supplied URLs or treat a link as trusted evidence. The private workflow must fail closed if the approved storage/review route is unavailable.

## Mutation and feedback contract
A submission or review must target a known current record revision. Stale reviews must not silently apply to changed evidence. Repeated requests need a specified idempotency rule rather than duplicate records or conflicting decisions. Concurrent updates need a specified conflict response. A persistence failure must not display successful submission or review. Transaction rollback and audit consistency need explicit tests in the chosen backend.

Do not emit personal evidence in public errors, broad logs or shared channels. Record only the approved minimal audit event and use neutral, non-enumerating failures where appropriate. The actual audit access and retention policy is not supplied by this document.

## Navigation and accessibility
The intended formal learner experience uses private, button-driven, in-place navigation without learner slash-command navigation or modal navigation. A Discord implementation must explicitly resolve actor binding, message/session expiry and re-entry without silently reverting to the inspected modal login. A web implementation needs an equivalent reviewed authenticated private workspace. No platform is selected here.

Retain keyboard usability, clear guest-role labels, readable evidence excerpts and an accessible text equivalent where screenshots are unsuitable. Do not collect medical information as a shortcut to accommodation design. Privacy needs both access-controlled presentation and protected persistence.

## Acceptance cases to implement and execute — none executed in this batch
| Case | Required outcome |
|---|---|
| Correct learner, current assignment, approved exercise, valid private route | Only the specifically allowed read/write is performed |
| Another learner's record identifier | Access denied without disclosing evidence |
| Correct learner but another course or workspace | Denied |
| Verified role without required course assignment | Denied |
| Forged client owner/reviewer/status fields | Rejected or ignored under an explicit contract; never authoritative |
| Assignment revoked during a protected operation | Fail-closed handling before protected delivery under defined consistency rules |
| Reviewer with no current record/course authority | Denied |
| Review against an obsolete evidence revision | Conflict/no application to the new revision |
| Duplicate request after timeout/retry | Defined idempotent result, no accidental duplicate transition |
| Concurrent submission/review | Defined conflict or serialization behavior, no silent overwrite |
| Storage, authorization or audit dependency failure | No false success, privacy-preserving response and specified recovery |
| Missing private route or expired navigation context | Stop/re-enter through the approved route; no public fallback or modal workaround |

Additional tests must cover limits, deletion/retention, accessible navigation and the exact identity/storage adapters. These are proposed cases, not a complete security test suite or executed CI results.

## Implementation gate
Before adding runtime handlers or migrations: approve the architecture, trusted context and review policy; choose the persistence and evidence contract; specify identity replacement and privacy behavior; review the tests. Then implement a bounded synthetic vertical slice without enabling production, and obtain separate approval for any live connection, deployment, collection or activation.

Existing read-only course behavior, formal-course publication flags, Community Learning and real learner state remain unchanged.
