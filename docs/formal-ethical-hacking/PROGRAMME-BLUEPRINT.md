# Comprehensive programme blueprint

Draft maintainer proposal, not a released course, new lab brief, certification endorsement or job guarantee. The programme goal is deep understanding plus credible preparation pathways toward OSCP, CPTS, GPEN and OSWE, with role-specific professional competence. These goals do not establish current coverage. The 37 canonical entries remain drafts; this document adds no lesson IDs or runtime progression.

## One programme, differentiated depth
Build a shared foundation, a professional penetration-testing pathway and an advanced web-specialist pathway. Do not present OSWE-level white-box work as an automatic beginner exit outcome. Do not require every learner to obtain all four credentials before demonstrating a defined role's tasks. Certification preparation, professional task performance and academy completion are separate decisions.

The proposed primary professional profile is an entry-level penetration tester working within explicit scope and review. The advanced web pathway targets deeper source-code investigation and custom web exploit development; its readiness must be demonstrated separately. Other security roles are not silently covered by this definition.

## Learning method
For each substantial skill: model the system; state its trust assumptions; predict an outcome; select a bounded authorized test; observe actual results; compare alternative explanations; explain impact; repair where applicable; retest both forbidden and legitimate behavior; communicate uncertainty. Tools support that process rather than replace it.

Progress from explained examples to guided practicals, then partially specified investigations and unfamiliar independent capstones. Reuse concepts across different implementations so a remembered command is not enough. Keep accessible text alternatives and clear host/guest labels. Fictional paper cases, small policy tests and actual system observations must remain distinguishable.

## Proposed pathway structure
| Stage | Intended learning | Evidence required before readiness claims |
|---|---|---|
| Shared foundation | Authorization, Linux/Windows administration, networking, HTTP/TLS, scripting and debugging | Reproduced setup, observed tasks and explanations; not page completion |
| Professional assessment | Reconnaissance, validation, controlled exploitation, privilege boundaries, internal assessment, AD/password reasoning | Approved isolated practicals with positive/negative controls and independent decisions |
| Advanced web specialization | Application architecture, source-to-sink analysis, debugging, advanced flaw classes and reliable custom exploit chains | Source-based investigation, controlled proof, repair/retest and technical report |
| Professional integration | Scope, evidence, stakeholder communication, remediation, retesting and handover | Original end-to-end assessment and reviewed deliverables |
| Target-specific preparation | Reconcile current provider objectives, eligibility, rules and assessment style | Target-specific objective map and independent readiness review |

This is a proposed design sequence, not a change to the current prerequisite graph or permission to execute any of those activities. Existing GET/HEAD and other exercise boundaries remain intact.

## Candidate map and gap register
Read the [candidate competency data](authoring/competency-plan.json), [gap analysis](authoring/COMPETENCY-GAP-ANALYSIS.md), [provider source register](authoring/CERTIFICATION-SOURCE-REGISTER.md) and [assessment/release plan](authoring/ASSESSMENT-AND-RELEASE-PLAN.md). K-labels are local planning identifiers, not canonical lessons or provider objective IDs.

The map is an index-level triage of selected candidate lesson anchors at source commit 9208dc716d3c45226f469d2595b2e029d9321966. It is not a full semantic review of all lessons or an exhaustive certification map. Neither candidate anchors nor source-heading matches establish proficiency, teaching sufficiency, exam eligibility or validated alignment.

## K03 follow-up — supporting Windows foundation drafts
The new [identity/context lesson](lessons/WINDOWS-FOUNDATIONS-01.md), [one-file ACL lesson](lessons/WINDOWS-FOUNDATIONS-02.md), [process/service lesson](lessons/WINDOWS-FOUNDATIONS-03.md) and [bounded evidence capstone](lessons/WINDOWS-FOUNDATIONS-CAPSTONE.md) begin authoring this gap. The [instructor guide](lessons/WINDOWS-FOUNDATIONS-INSTRUCTOR.md) and [bounded validation record](lessons/WINDOWS-FOUNDATIONS-VALIDATION.md) distinguish paper scenarios, command drafts and unexecuted Windows work. They are supporting documents outside the 37-entry canonical catalogue; no existing prerequisite or execution permission changes. K03 is not marked complete, platform-validated or certification-aligned. The earlier candidate map retains its stated snapshot and canonical-anchor meaning.

## K06 follow-up — tested offline scripting foundation
The [program-tracing lesson](lessons/PYTHON-FOUNDATIONS-01.md), [validation/error lesson](lessons/PYTHON-FOUNDATIONS-02.md), [testing/regression lesson](lessons/PYTHON-FOUNDATIONS-03.md) and [connected capstone](lessons/PYTHON-FOUNDATIONS-CAPSTONE.md) use a correct standalone synthetic-record summary tool and visible tests. The [instructor guide](lessons/PYTHON-FOUNDATIONS-INSTRUCTOR.md) and [selected local execution record](lessons/PYTHON-FOUNDATIONS-VALIDATION.md) preserve the distinction between an offline working example and validated student-platform or production behaviour. This is supporting K06 material, not canonical registration, a network-automation grant, a general evidence importer or complete programming/certification readiness. The 37-entry catalogue and earlier mapping snapshot remain unchanged.

## K08/K06 follow-up — command/argument boundaries
The [command-argument practical](lessons/COMMAND-ARGUMENT-BOUNDARY.md) and [fixture instructions](fixtures/command-argument/README.md) provide a deliberately unsafe fixed-input starter, separate repaired reference and direct/CLI tests. The [corrected validation record](lessons/COMMAND-ARGUMENT-VALIDATION.md) identifies its local evidence and packaging correction. This is one foundational interpreter-boundary exercise, not a completed exploitation or advanced-web pathway. The unsafe source must remain outside academy runtime.

## K13 follow-up — password representations and offline verification
The [representation lesson](lessons/PASSWORD-REPRESENTATIONS.md) and [offline verifier practical](lessons/PASSWORD-VERIFIER-LAB.md) teach encoding/hash/KDF distinctions, salt/parameter handling and selected verification checks using invented values. The [instructor guide](lessons/PASSWORD-VERIFIER-INSTRUCTOR.md) and [selected validation](lessons/PASSWORD-VERIFIER-VALIDATION.md) distinguish local tests from production crypto/authentication, FIPS, student-platform or certification claims. This adds supporting teaching, not canonical registration, permission to test accounts, a credential store or completion of K13.

## K05/K08/K14 follow-up — application ownership bridge
The [in-process application lab](lessons/APPLICATION-OWNERSHIP-LAB.md) connects request routing, value-bound in-memory SQL, resource policy and response status/headers/body. It supplies a defective starter, a separate repaired policy and reused application/CLI tests; [selected validation](lessons/APPLICATION-OWNERSHIP-VALIDATION.md) records what ran. Actors are invented trusted harness inputs, not authentication; no listener or real network request is provided. This is a bridge beyond a Boolean model, not a deployable service, canonical registration, actual login flow or complete advanced-web/certification pathway.

## K11 follow-up — directory and Kerberos foundations
The [directory/authority lesson](lessons/DOMAIN-FOUNDATIONS-01.md), [Kerberos walkthrough](lessons/KERBEROS-FOUNDATIONS-02.md) and [paper capstone](lessons/DOMAIN-FOUNDATIONS-CAPSTONE.md) begin this gap with legitimate roles, ticket-stage evidence and separate resource authorisation. The [instructor guide](lessons/DOMAIN-FOUNDATIONS-INSTRUCTOR.md) and [bounded author record](lessons/DOMAIN-FOUNDATIONS-VALIDATION.md) explicitly distinguish fictional records from executed domain work. No fake Kerberos service, canonical registration, live domain permission, validated lab or completed K11/certification pathway is implied. The earlier index-level candidate snapshot remains unchanged.

## Delivery and approval boundaries
Student-built environments remain the proposed delivery model; hosted labs are deferred. Windows/domain/cloud exercises require their own reviewed provisioning, isolation, licensing, cost and permission decisions. No subscription, equipment purchase or public-cloud activity is approved here. No instructional fixtures may be imported into academy runtime.

Discord versus web delivery remains unresolved. The proposed private identity, course authorization, evidence, review and persistence contract must be implemented and tested separately. Community Learning is excluded. A staged delivery rehearsal must not shrink the final educational ambition or be advertised as the complete programme.

Next implementation work should close the prioritised gaps and release blockers rather than continually add optional case packs. Completion dates, pass marks, certification outcomes and employment rates require evidence; none is invented by this plan.
