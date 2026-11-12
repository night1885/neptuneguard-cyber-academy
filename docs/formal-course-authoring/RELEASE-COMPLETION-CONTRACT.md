# Consolidated course completion contract

Proposed owner release contract, not completed teaching, learner content, deployment permission or an operational gate. Inspected source head: dd01f49a7387fbd981815423fb852b792fc18969. PR #59 was draft, seven commits/17 changed files at inspection. This document and the selection changes require owner approval. No completion percentage, effort estimate or release date is asserted.

## Fixed requirements and precedence
The requested product is two substantial, job-oriented formal courses, each with a defined finish line and completion certificate, deep step-by-step teaching and student-built labs. No XP, badges or unrelated reward mechanics are introduced for these courses. Community Learning, including its existing rewards, remains unchanged. External certifications are not enrolment or graduation prerequisites; any preparation mapping or endorsement claim requires its own current evidence.

The later recorded platform decision is private, button-driven Discord with in-place navigation (authoring/DISCORD-WORKSPACE-DECISION.md). Do not reopen Discord versus web as an unresolved question because an earlier document says so. Architecture details beyond that platform choice still require implementation and tests.

The owner's current release direction is one complete production release per course, with no mandatory separate pilot, new staging service or deployments per lesson. This supersedes older proposed pilot/staging rollout gates for this contract; it does not waive isolated synthetic tests, owner acceptance, safe recovery or exact deployment approval. Copilot is unavailable and is not a dependency. Assistant self-review is not independent human assessment. No review request is retried by this contract.

## What actually exists
The branch has an owner-only source assembler and format-specific output verifier, not a complete learner product. The selected baseline contains 37 canonical EH drafts, 16 supporting sources and the shared human/AI unit; IR uses eight legacy SOC anchors plus shared human/AI and evidence/recovery teaching. The proposed selection adds eight inspected existing supporting sources, without rewriting them. Expected counts become 62 EH sections, ten IR sections and 65 unique inputs. Source hashing/inclusion is not semantic curriculum acceptance.

course-registry.js currently imports Linux Fundamentals, Linux Administration, Linux Security Engineering and legacy SOC content, not two completed new formal programmes. certification-student-course-content.js and certification-course-readiness.js show that content access/lifecycle infrastructure already exists; it must be reused/extended deliberately, not declared absent or replaced blindly. formal-first-journey-content.mjs contains Start plus nine EH draft pages, optional read-only worksheet support and explicit no-saved-progress/submission/grade/award limits. That is not the full two-course learner workflow. Source inspection does not establish live Render/Discord/database configuration.

The earlier 14 EH/13 IR conversation candidates have not been recovered as complete original chapter files in the inspected authoring paths. A summary/count is not chapter content. Do not reconstruct them from third-party courseware or call them integrated. Their intended original content must be recovered or independently authored against the approved outcomes. This audit did not perform a full semantic review of every repository lesson.

## This batch: select existing substantive sources
Only the owner source selection changes. All 37 canonical IDs/order, legacy pins, eight SOC module numbers and source-only flags are preserved. Instructor/validation/rubric files stay excluded. Optional supplements stay optional; practical permissions and deliberately unsafe starter boundaries remain unchanged. No exercise is executed merely because its prose enters a review book.

| Added supporting source | Inspected Git blob |
| --- | --- |
| COMMAND-ARGUMENT-BOUNDARY.md | 849cfe37185ac010b3f14c86d1f01b3054f9dfd9 |
| PASSWORD-REPRESENTATIONS.md | eb72954995f8cb25de980bac47545fb19c9f10d3 |
| PASSWORD-VERIFIER-LAB.md | 68325094dc792b66a46e41ead2ae412a657ebfd2 |
| LINUX-PRIVILEGE-BOUNDARIES.md | 828f18722dd73201f352a758b4f67afa4505dc6a |
| LINUX-PRIVILEGE-CASES.md | cbfeed0f1a4298029301b06ceb63ef95a9239f96 |
| EXECUTABLE-SEARCH-LAB.md | b1a8ae662fabd579596650af566902604fe52a8a |
| LOOPBACK-HTTP-LAB.md | d97f15652fce194463fc206a229f13e7e9a0dc21 |
| AUTHORIZATION-REGRESSION-WORKSHOP.md | b55f9e19862a33b3a0a249d4906fce4bb26504e7 |

## EH: finite existing competency scope
K01-K21 are the existing local planning IDs from competency-plan.json, not new canonical lessons or vendor objective IDs. The table reconciles selected evidence; it does not mark any domain release-complete or claim that uninspected files contain nothing useful. Professional and advanced-web outcomes must retain the blueprint's differentiated depth; source headings alone do not establish either exit level.

| ID | Outcome | Inspected contribution | Acceptance still needed |
| --- | --- | --- | --- |
| K01 | Scope, ethics and planning | Scope/evidence drafts | An unfamiliar scoped engagement plan and defensible decisions |
| K02 | Linux administration | Canonical Linux drafts | Supported setup and independent administration/troubleshooting |
| K03 | Windows administration | Foundation drafts and selected owned-child CI | Native permission/service tasks on the declared student route |
| K04 | Network, HTTP and transport trust | Canonical drafts and selected loopback observations | Independent diagnosis and transport limitations on supported routes |
| K05 | Web identity and data boundaries | Canonical and application model/loopback material | Integrated application enforcement including positive/negative controls |
| K06 | Scripting and debugging | Python foundation and interpreter-boundary sources | Independent tracing, repair, error handling and regression work |
| K07 | Reconnaissance and validation | Assessment drafts and fixed known-port native helper | Reviewed wider isolated enumeration/validation with scope controls |
| K08 | Controlled exploitation | Fixed interpreter-boundary exercise | Scoped impact proof and recovery beyond the small example |
| K09 | Linux privilege boundaries | Paper cases and same-identity executable selection | Separately authorised higher-authority practical and repair/retest |
| K10 | Windows privilege boundaries | No complete pathway established in this inspection | Original scoped practical, repair and independent explanation |
| K11 | Directory and Kerberos | Paper foundation drafts | Reviewed provisioning/licensing, native execution and independent investigation |
| K12 | Internal assessment and segmentation | No complete pathway established in this inspection | Isolated topology, constrained internal assessment and recovery |
| K13 | Password representations and testing | Offline invented-value verifier sources | Approved broader credential-assessment teaching and independent decisions |
| K14 | White-box application investigation | Canonical sources and code-review pathway index | Complete traced application investigation and independent review |
| K15 | Custom web proof and chaining | No complete pathway established in this inspection | Original bounded source-led proof, reliability and repair/retest |
| K16 | Evidence, reporting and retesting | Canonical evidence/reporting drafts | Original supported findings and verified legitimate/forbidden retests |
| K17 | Independent engagement | Draft capstones | Unfamiliar engagement, intervention record and reviewed handover |
| K18 | AWS foundations | No complete pathway established in this inspection | Reviewed scoped route, cost/permissions and honest simulation/native labels |
| K19 | Azure/Entra/hybrid identity | No complete pathway established in this inspection | Reviewed scoped route, authority evidence and recovery |
| K20 | Post-exploitation and recovery | No complete pathway established in this inspection | Bounded original teaching, permissible observations and recovery evidence |
| K21 | Client/endpoint boundaries | No complete pathway established in this inspection | Reviewed original cases/practicals without protection-disable shortcuts |

## IR: proposed finite acceptance scope
IR01-IR13 below are new release-checklist labels, not recovered chapter titles, canonical IDs, registered modules or evidence that 13 chapters were authored. Owner approval of this scope does not make its content complete. The eight legacy SOC anchors and two supporting drafts must be mapped/reviewed against these outcomes, with original missing teaching authored. Paper cases and selected owned-process observations do not satisfy all native investigation outcomes.

| ID | Required outcome |
| --- | --- |
| IR01 | Service context, readiness and decision ownership |
| IR02 | Triage, urgency and competing hypotheses |
| IR03 | Source provenance, handling and time uncertainty |
| IR04 | Windows event/process investigation |
| IR05 | Linux host/service investigation |
| IR06 | Network/session evidence and visibility limits |
| IR07 | Identity, application and cloud investigation |
| IR08 | Memory investigation and interpretation limits |
| IR09 | Suspicious-file/malware triage in a reviewed isolated route |
| IR10 | Human reports, AI assistance and permission boundaries |
| IR11 | Scoped containment/eradication decisions and preservation |
| IR12 | Measured service recovery, monitoring and handover |
| IR13 | Independent integrated investigation, report and lessons learned |

## Shared release acceptance gates
Apply these to each course. They are acceptance criteria, not eight equally sized tasks or a scheduling estimate. Status at this snapshot: OPEN for end-to-end course acceptance. Existing infrastructure and selected successful tests are contributions, not proof that a gate is wholly absent or complete.

| Gate | Acceptance evidence |
| --- | --- |
| R1: Scope and teaching | All in-scope outcomes mapped to reviewed lessons, prerequisites, tools and independent tasks; neither headings nor CI counts close this gate. |
| R2: Lab route | Declared student host/guest routes, licensing, official media/integrity, lower-resource options, topology, isolation, reset and cleanup reproduced; no unapproved paid or cloud resources. |
| R3: Learner/instructor separation | Student sources separately reviewed; solutions, marking guidance and private records are not served as course content. Owner books are not published wholesale. |
| R4: Private Discord journey | In-place actor/guild/course-bound course entry, overview, application/status, approved dashboard, Back/Next, Save/Resume and recovery implemented and tested; no learner slash/modal navigation. |
| R5: Persistence, authorisation and privacy | Current admission/course/lab/reviewer authority, restart/repeat-click/concurrency/dependency-failure handling, evidence limits and retention/deletion tested with synthetic records. |
| R6: Assessment and completion certificate | Clear graduate finish line, independent tasks, reviewer decisions/feedback and appeal/resubmission; certificate eligibility, issuance, duplicate/revocation rules tested; no XP/badges/reward mechanics for these courses. |
| R7: Acceptance and regressions | Owner end-to-end acceptance, accessibility, safety/security checks and no Community Learning regressions; distinguish source tests from platform and learner performance. |
| R8: Single production release | Exact reviewed commit/configuration/change inventory, backup/recovery and rollback plan, separate merge/deploy approvals, and post-deploy verification; no mandatory extra pilot/staging service or per-lesson release. |

## Defined finish line and one implementation package
EH completion must demonstrate an unfamiliar, authorised isolated engagement: justified scope, supported setup, relevant technical assessment, defensible impact, remediation/retest, professional report and stakeholder handover. Advanced-web claims need their separately demonstrated deeper source-led investigation; no external exam pass is required for the academy certificate. IR completion must demonstrate an unfamiliar incident investigation: traceable evidence and uncertainty, supported collection/analysis, scoped response decisions, validated recovery and clear handover. A paper-only task cannot certify a native skill that was never exercised.

Certificate criteria, assessor capacity, supported student platforms and evidence-retention rules must be made concrete before implementation can be called complete. No numeric pass threshold or automatic award is invented here. These details remain open; they are not silently resolved by picking a default.

Stop adding optional case packs. Work against this finite scope in one coherent integration package: reconcile/recover original curriculum; complete teaching/labs and separated instructor material; implement the full private Discord journey using existing authorisation/lifecycle infrastructure; implement/test persistence, assessments and certificates; run regressions and owner acceptance; then present exact per-course release candidates. Keep disagreements/failures explicit rather than shrinking scope or changing expected results to obtain green tests.

For each criterion record the implementation paths, acceptance test, actual result, environment, source revision, reviewer/decision and remaining blocker. Only actual observed results close an execution criterion. This document is the checklist, not those missing results. Deployment remains NO-GO until the relevant course meets its accepted criteria and receives its separate resolved merge/deploy approvals.

## Validation and non-effects
Manifest/README baseline blobs and selection preservation are checked locally. Newly selected source prose was inspected; its cited historical validation remains bounded to its original context. Full actual checkout assembly/verification for this new selection is not claimed locally. Existing read-only CI will run it after the approved commit; its results must be inspected. No new fixture, executable code, workflow, registry entry, live database/Discord operation, production setting, merge, deployment or learner activation is part of this batch.
