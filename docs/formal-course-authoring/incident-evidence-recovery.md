# Incident evidence, decisions and defensible recovery

Supporting formal Incident Response draft. The registered eight-module SOC course is a reusable source anchor, not silently renamed or replaced. This unit implements no incident collector, containment action, learner state, grade or certificate. The case is original and fictional.

## Start with the question
Harbor Ledger receives a report that one customer saw another customer's order. Separately, a helper process and a large network transfer are reported during a requested maintenance window. Do not combine these into one confirmed attack before checking source relationships. Requested maintenance is not approval; approval would not by itself prove that every action was legitimate.

Record observed facts, hypotheses, missing sources and the requested decision separately. A service outage may justify urgent escalation while its cause remains unknown. A working service can still violate a data-access policy. Confidence, business urgency and supported technical impact are different dimensions.

## Evidence and time
For every source, record origin, collection method, time, tool/configuration, source coverage, handling and limits. Keep original bytes separate from derived timelines. A SHA-256 comparison supports selected byte integrity, not publisher identity, complete custody or truthfulness of the export.

Normalize explicit timezone offsets while preserving original timestamps and source references. Do not guess a timezone for a naive timestamp. Distinguish event, collection and display time. If a supplied clock offset is uncertain, retain an interval; more displayed decimal places do not prove accuracy. Overlapping intervals do not establish causal order, and source-line order is at most a deterministic presentation convention.

## Scope with contradictory evidence
A successful application read paired with trusted actor/owner context can demonstrate a policy violation under the supplied contract. Authentication failures, later success, a reused PID, DNS resolution, a connection and byte volume require separate interpretation. Do not call a transfer exfiltration without content/context evidence. Process names and PIDs alone do not establish the same execution instance across hosts or boots.

Retain contradictions. A missing process key is unresolved identity, not permission to choose the most convenient PID candidate. Missing telemetry is not proof of no activity until collection configuration and coverage are established. A small fixture or query can organise evidence without computing a complete incident verdict.

## Decision and recovery exercise
Prepare two fictional options: temporarily restrict the affected read function or release a reviewed ownership repair. For each identify the decision owner, exact resource/action, business impact, preservation, validation and fallback. Mark proposed, approved, executed and verified separately. No action is executed by this paper exercise.

Define positive and negative recovery controls: legitimate customer reads work; foreign reads are denied; protected fields cannot be modified; relevant monitoring is visible; and the business owner has an accurate handoff. Do not average away a failed critical condition or call universal errors a successful repair. Absence of alerts is not reassuring if the source is disabled.

## Independent work and reporting
Write a staged triage note before revealing additional evidence, then revise it without rewriting the original to imply prior knowledge. Add an unrelated legitimate maintenance event and one unknown clock profile to a derived synthetic case. Explain how each affects confidence and scope.

Submit a provenance ledger, timeline with limits, competing hypotheses, supported scope, decision log, recovery criteria, technical report and concise stakeholder update. Include AI assistance disclosure or none. Correct an overconfident generated summary rather than preserving it for polish.

Native Windows/EVTX, memory, packet, cloud and real identity collection; supported student-built routes; actual containment/recovery; independent assessment and legal/retention policy remain separately unvalidated. This unit follows an evidence-led method without claiming a real incident was investigated, a system restored, or a professional programme completed.

## Staged case packet: Harbor Ledger
All records below are invented teaching statements, not native exports, actual customer information or results from the repository's CI helpers. The exercise date is fictional. No host, account, order identifier or transfer is an operational target. This is paper analysis: do not reproduce requests against an academy, customer system or unrelated application.

Work in four rounds. Save each submission before reading the next round and maintain a change log explaining what changed your view. These headings provide pacing only: this complete owner-authoring file contains all rounds and assessment discussion, not an enforced learner gate or an unseen assessment. A learner release requires separately reviewed student/instructor materials and delivery protections.

### Round A: the report is not the verdict
The fictional service lets customers read orders belonging to their own tenant. Authentication alone is insufficient. Ordinary customers cannot change an order's tenant assignment. This stated contract, not a guess about every real application, defines the expected access decisions in this case.

| Source ID | Supplied statement | Missing context |
| --- | --- | --- |
| A1 | A support ticket says customer a-17 saw order ORD-B9 while using a normal customer session. The ticket mentions request r-41. | No server-side actor/owner context or captured response yet. |
| A2 | Maintenance request m-7 asks to rebuild cache-index between 10:00 and 10:10 on fictional 2030-04-05. | Approval, implementation and validation are not supplied. |
| A3 | A summary mentions an 87 MB transfer, host WIN-LAB, PID 6789 and displayed time 10:06. | No date, timezone, event-versus-collection definition, boot key, content or collection coverage. |

Submit a 120-word triage note. Separate the reported access issue, maintenance request and transfer observation. For each, state a bounded hypothesis, the next discriminating source and a decision that cannot yet be justified. Also name who should own the fictional service-impact decision. A technically plausible theory is not yet confirmed scope.

Do not request general account secrets, complete customer records or an unrestricted host export just to make the packet larger. Explain what selected fields would answer your question and what authority/preservation review would be needed before real collection. There is no real collection authorisation in this case.

### Round B: correlate carefully and keep the contradiction
The following server-side context is stipulated as trustworthy within the paper case only. No export authenticity, token signature or legal custody has been independently verified by this text. Do not promote that teaching assumption into an operational assurance claim.

| Source ID | Added case statement |
| --- | --- |
| B1 | Reviewed server-side request capture r-41 identifies authenticated ordinary actor a-17 in tenant T-A, looked-up order ORD-B9 in tenant T-B, response 200, and confirmed inclusion of that order's non-public fields in the response. The record's event time is 2030-04-05T10:05:12Z on API-1. |
| B2 | Edge receipt for r-41 has event time 2030-04-05T10:05:11Z on EDGE-1. It identifies the same request, not an additional disclosed order. |
| B3 | For this short interval, API-1 reported time minus reference time lies between +1 and +3 seconds. EDGE-1 reported time minus reference time lies between -1 and +1 seconds. These are bounded case assumptions, not measured clock profiles. |
| B4 | An auxiliary display shows 2030-04-05 10:05:11 with no offset, clock profile or time-field definition. |
| B5 | Two candidate process records contain PID 6789 on WIN-LAB: one from boot-A and one from boot-B, with different start observations and image names. A3 still has no boot key or reliable event time. |
| B6 | The approval register records m-7 as approved for cache-index only. It does not authorise customer-order reads or establish what produced A3. No implementation evidence for m-7 is supplied. |

For this contract, B1 supports a cross-tenant disclosure for the selected request: it supplies actor context, resource tenancy and a returned protected-data outcome. A status 200 by itself would not establish that. B2 must not be counted as a second disclosed order. Distinguish the supported selected impact from the still-unknown total affected population, duration, intent and root cause.

For the supplied clock convention, reference time equals reported time minus offset. Retain API-1's reference interval 10:05:09Z through 10:05:11Z and EDGE-1's interval 10:05:10Z through 10:05:12Z on the fictional date. They overlap. These clock values alone cannot impose a strict event order. Request-flow semantics may supply a relationship, but explain that separately rather than claiming the timestamps prove it. B4 remains unnormalised; a machine's current timezone is not a substitute for missing source context.

Do not attach A3 to either B5 process merely because the PID matches. Neither a process image name nor the new native Windows demonstration's successful cleanup resolves this fictional identity gap. The CI helper ran its own experiment on another execution context; it is not evidence from WIN-LAB. Approval B6 weakens the statement that all maintenance was unauthorised, but neither proves A3 legitimate nor links it to the disclosure. Retain both the supported disclosure and unresolved transfer without collapsing them into one attack chain.

Revise the triage note with explicit source IDs. Add a provenance ledger with fields for origin, supplied/collected status, trust assumption, event and collection times, handling and coverage. Where original export bytes, collector settings or custody records were not supplied, write unavailable. Do not invent a digest or describe an invented table as a forensic acquisition.

### Round C: a candidate can stop access and still fail recovery
A fictional team proposes candidate C. Its supplied test observations are:

| Recovery condition | Case expectation | Candidate C observation |
| --- | --- | --- |
| a-17 reads an order in T-A | 200 and only authorised order fields | 403 |
| a-17 reads ORD-B9 in T-B | Deny and no protected fields returned | 403 and no order body |
| Relevant monitoring works | A controlled permitted and denied request are visible with usable context | Export source disabled; no events visible |

These are supplied paper observations, not tests executed against this repository. Candidate C fails the positive service control and observability control. Universal denial is not proof of a successful repair. A blocked export does not prove no violations occurred. Do not average successful denials into an overall pass while a critical condition fails.

Prepare two scoped decision proposals: temporarily restrict the affected order-read function, or hold reopening pending a reviewed ownership repair. For each list decision owner, exact function/environment, expected customer harm, preservation needs, monitoring dependencies, verification, fallback and expiry/review point. Name proposed, approved, executed and verified as separate states; this exercise executes none of them. Do not turn a rollback proposal into an unreviewed return to a known-vulnerable state.

### Round D: bounded reopening is not incident closure
A revised fictional candidate D supplies the following selected observations. They are separate from C, not retroactive replacements for C's failures.

| Control | Supplied D result |
| --- | --- |
| Ordinary T-A customer reads its own test order | 200; expected T-A fields only |
| Ordinary T-B customer reads its own test order | 200; expected T-B fields only |
| Ordinary T-A customer reads ORD-B9 | 403; no protected order fields |
| Request with no valid session | 401; no order body |
| Customer tries to change protected tenant assignment | 400; assignment unchanged |
| Required server-side ownership context is unavailable | Denied; sanitised error; no protected fields |
| Controlled permitted and denied reads are observed | Both visible with request, decision and tenant context; no secrets or raw order bodies logged |
| Recovery handoff | Named owner, change identity, bounded test evidence, monitoring review point and fallback are recorded in the paper packet |

The statuses are this case's contract, not a universal requirement for every application. Body/field outcomes and unchanged protected state matter alongside status codes. Selected results support a conditional proposal for this function under the stated assumptions, not a declaration that all routes, users, replicas, caches, privileges or data stores were independently tested. The unexplained transfer and unknown wider disclosure scope remain open investigation items.

Write a 90-word stakeholder update distinguishing service restoration recommendation, incident scope and unresolved evidence. Give the fictional decision owner a bounded reopen/hold proposal with a review point and a condition that would trigger reconsideration. Do not assert that the decision was approved or executed. Notification obligations depend on the actual jurisdiction, contract, data and authorised advisers; this fictional packet supplies none of those determinations.

### Independent variation and formative review
Create a derived packet, preserving the original: add an authorised cache maintenance record, remove one recovery observation and replace one clock profile with unknown. Explain which conclusions change and which remain supported. Ask another reviewer to challenge a specific inference; an AI-generated challenge is assistance, not independent assessor approval.

Submit the four saved notes, source ledger, uncertainty-aware timeline, competing hypotheses, decision proposals, recovery matrix and assistance disclosure. A reviewer checks source traceability, tenant-policy reasoning, unsupported joins, clock limits, negative and positive controls, missing monitoring, decision authority and revision honesty. Critical unsupported claims require correction regardless of prose quality; this is formative discussion, not calibrated certificate scoring. The expected reasoning is visible in this owner draft, so repeating it is not evidence of unseen independent performance.

### Method sources and limits
NIST SP 800-61 Revision 3 places detection, response and recovery within wider cybersecurity risk management and ongoing improvement. Recovery includes confirming normal operation; completion depends on criteria and documentation. This original paper case uses that framing but is not NIST certification, a prescribed NIST lab or a substitute for an organisation's plan: https://csrc.nist.gov/pubs/sp/800/61/r3/final .

OWASP's Authorization Cheat Sheet distinguishes authentication from authorisation and recommends least privilege, deny by default, server-side permission validation for every request, appropriate logging and authorisation tests. Those principles inform the fictional contract and recovery controls, not an inference that the academy application has this fictional defect: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html .

No collector, exploit, containment, repair, native export, student environment, runtime assessment, legal determination or learner publication is implemented by this addition. Existing source-review CI assembles the selected teaching text; it does not validate the fictional investigation as a real incident or certify its curriculum quality.
