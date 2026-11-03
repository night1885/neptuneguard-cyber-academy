# Core work packages — implementation and acceptance plan

Draft maintainer plan, not a learner worksheet, lab brief, assessment rule or activation. Baseline 4904c163f75eb6a113b57d47f7ad33e7158bf06c. Read the [dated gap reconciliation](COMPETENCY-GAP-ANALYSIS.md), [programme blueprint](../PROGRAMME-BLUEPRINT.md) and [existing release gates](ASSESSMENT-AND-RELEASE-PLAN.md). WP labels below are planning labels, not canonical lesson IDs or runtime states.

## Work selection
Start WP-A with source/contract inspection; advance only a fully specified, reviewed implementation bundle. Prepare the WP-B environment/permission decisions in parallel, without provisioning or purchases under this plan. WP-C needs an approved execution context for actual observations. WP-D remains lab-design/approval work until its distinct environment and authority are supplied. This is dependency planning, not a promised delivery order or change to course prerequisites.

Each package should bundle its contract, relevant source/test changes if separately approved, positive and negative controls, measured validation and handover into one review. Do not stop after every file or count new pages as gap closure. Responsible maintainer, independent reviewer and actual execution owner must be nominated before their respective work; no person, date, effort estimate or completion percentage is invented here.

## WP-A — repeatable offline core implementation, K06 with K05/K14 support
Starting evidence: [scripting validation](../lessons/PYTHON-FOUNDATIONS-VALIDATION.md) and the [existing offline-core CI design](code-review-pathway/OFFLINE-CORE-CI-REVIEW.md).

First inspect the exact current summary source, tests, input/output contract and existing workflow/runner selection. The scripting record identifies duplicate textual JSON keys as a documented limitation; that is not by itself a newly established vulnerability or permission to change the contract. Specify intended decoding/error behaviour before proposing a repair or hardening change. Do not add a second runner or workflow before checking the existing one.

Proposed implementation bundle: a bounded contract change only where justified, corresponding local source/tests, preserved legitimate summary behaviour, malformed/type/boundary controls, fixed non-echoing error behaviour and exact-file CLI checks. Keep fixtures correct or deliberately defective according to their existing teaching role. Preserve original expectations unless a separately reviewed contract change explicitly justifies a versioned update.

Acceptance evidence: pinned sources and named commands; actual starter/reference or unchanged-correct results as applicable; a selected temporary regression caught for the intended reason rather than import/syntax failure; source restoration; and current results for the relevant allowlisted jobs after any approved code/workflow change. Distinguish methods, subcases, assertions and runner invocations. Inspect actual workflow events/paths before claiming a documentation push executed those groups. Mock-only executable-search contracts must remain separate from actual helpers.

Stop for unspecified semantics, uncontrolled input, missing supported setup or a transport/credential dependency. No network client, scanner, learner collection or production importer is part of this package. Do not claim complete mutation coverage, hostile-input assurance or independent learner competence from a selected green suite.

## WP-B — supported foundation reproduction, K02/K03
Starting evidence: [Windows foundation record](../lessons/WINDOWS-FOUNDATIONS-VALIDATION.md), [Linux foundation record](../lessons/LINUX-FOUNDATIONS-VALIDATION.md) and the existing guest lessons, whose requirements remain mandatory.

Proposed preparation bundle: name the supported OS/architecture and ordinary-account route, approved media/tool versions and transfer method, licensing authority, resource availability, isolation/recovery procedure, actual support contact and private evidence policy. An unfilled prerequisite is BLOCKED, not a request to install software, reconnect, elevate or substitute an unrelated host. A root POSIX author sandbox cannot establish native Windows/PowerShell reproduction.

Only after a separate actual brief approves that route, reproduce the existing scoped identity, owned-file/permission and self-process/service-observation tasks as their lessons permit. Preserve actual outputs, unexpected faults, stops and identified cleanup state. Do not broaden observation into service control, global permission changes or privilege escalation. Any change to the reviewed task requires its own approval.

Acceptance evidence: source/version and environment identity, genuine ordinary-account observations, legitimate/rejection controls where applicable, an accessible learner walkthrough and independently reviewed explanations. Native execution, guest/media feasibility, cleanup and private handoff must be evidenced separately. JSON-case checks are not a native operating-system practical. No hardware compatibility or completion claim follows from this plan.

## WP-C — source investigation and handover, K05/K14/K17
Starting material: [existing independent investigation](code-review-pathway/03-INDEPENDENT-INVESTIGATION.md) and its [integration record](code-review-pathway/VALIDATION.md). Reuse the authored pathway rather than duplicate another worksheet or capstone.

Proposed bundle: reconcile task, source snapshot and permitted factories; preserve source-based hypotheses and nearest legitimate controls; obtain actual response/stored-state observations only in the approved in-process context; connect a narrow repair or explicitly unexecuted diff proposal to positive/negative retests; and review a bounded technical/stakeholder handover. Keep assumed Actor context, row authority, editable fields, revision and transaction outcome distinct. A response label cannot replace a state observation.

Acceptance evidence must separate reasoning, actual execution and independence. Record hints/reference exposure and source-predicted/BLOCKED/unattempted stages honestly. The visible ownership/update applications are familiar teaching material. A transfer example's existence or a blank hint log does not prove unfamiliarity or unaided work. A genuinely unfamiliar assessment needs a separately authored/reviewed variant, controlled distribution, benchmark review and learner calibration before such a claim.

This package does not extend the EH-WEB-04/05/06 capstone, add a live endpoint, authorize loopback transport or set a pass mark. Do not expose protected marking material, real identities or learner reports in the repository.

## WP-D — professional lab candidates, K08/K09/K11/K13
Starting evidence: [Linux boundary limitations](../lessons/LINUX-PRIVILEGE-VALIDATION.md), [domain limitations](../lessons/DOMAIN-FOUNDATIONS-VALIDATION.md) and [password-verifier limitations](../lessons/PASSWORD-VERIFIER-VALIDATION.md).

Choose a coherent next candidate only after specifying its learning outcome, legitimate baseline, authority boundary, approved identities/environment, non-destructive proof, negative control, recovery and evidence handling. Obtain an explicit provisioning/licensing/cost/network decision before any real OS/domain/cloud activity. This plan supplies no targets, credentials, attack commands, subscriptions or permission to build a domain.

Acceptance must distinguish paper threat reasoning, source/mock checks, same-identity effects and an actual authorized higher-authority or protocol observation. A local verifier does not implement real authentication, and fictional Kerberos records are not observed tickets. Preserve the safe existing foundation while designing the missing practical; do not relabel it as a completed exploitation, escalation or domain pathway.

## Common release and review gate
Before any learner pilot, resolve the actual private delivery/workflow decision, actor/course/reviewer authorization, minimum evidence, retention/deletion authority, accessibility and support. Existing [assessment/release gates](ASSESSMENT-AND-RELEASE-PLAN.md) still control design, curriculum, lab operations, rehearsal and activation separately. No real learner collection is authorized here.

For every package report what changed, what ran, what failed or stayed blocked, the limits and the next approval needed. Review the entire proposed source/test/document bundle once; obtain fresh approval for each external write, purchase, environment change or deployment. Green CI is a checkpoint, not a competency, exam-alignment, enrolment, grade, access or award decision. No production/Discord/database/Render setting, Community Learning or runtime/publication flag changes under this plan.
