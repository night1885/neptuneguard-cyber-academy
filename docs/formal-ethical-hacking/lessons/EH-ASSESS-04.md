# EH-ASSESS-04 — Separate severity, priority and confidence

Draft paper exercise, not published. Requires EH-ASSESS-03. No real remediation, scanning or exploitation is authorized. Proposed ID only.

## Outcomes
Distinguish technical severity from an asset-specific priority decision, explain the role of missing evidence, and propose a defensible handoff.

## Different questions need different answers
Technical severity describes vulnerability characteristics. Operational priority concerns what an organization should address first under its circumstances. Confidence describes how well the available evidence supports a claim. A severe hypothetical weakness with uncertain applicability is not the same evidence state as a confirmed local control failure; neither should be silently converted into a universal priority number.

FIRST states that CVSS Base scores measure severity and should not be used alone to assess risk. If quoting a score, preserve its source, CVSS version, vector and relevant metric grouping where available. Do not invent a vector to make a report look complete or compare different versions as if their numbers were interchangeable. This lesson requires no score calculation.

Consider applicable exposure, required access, affected functionality, data sensitivity, service criticality, actual compensating controls, remediation availability and change constraints. These are questions for evidence gathering, not permission to inspect production data or bypass safeguards. Avoid unsupported likelihood percentages and invented business-loss estimates.

## Choose the next decision, not just a label
A useful recommendation can be to confirm product identity, validate an affected configuration, schedule an authorized update with recovery checks, or close an inapplicable advisory match with an explicit basis. Selecting among these requires the actual owner, scope and policy. A student must not patch or restart an academy or organizational service because a worksheet suggests it.

Treat a proposed mitigation separately from a verified correction. Document the original claim, approved change, verification method and residual uncertainty. A later retest needs comparable evidence; 'the ticket is closed' is not a technical observation by itself.

## Apply the fictional cases
Using the same case pack, explain which decision should occur next for each case and why. If asked for an ordering, state the objective being optimized and the missing facts that could reverse it. A reasonable answer may prioritize clarification of an unknown asset rather than claim that it is definitely safe or definitely vulnerable.

For the supplied records distinguish: advisory-level impact, supported asset-specific consequence, hypothetical wider impact and unknown business context. Do not turn the case pack into a real advisory or claim any product has a published vulnerability.

## Deliverables
Write a concise owner-facing note for each case: evidence summary, applicability state, severity source if any, relevant context, confidence limits, next authorized decision and verification needs. Use TRIAGE-EVIDENCE-WORKSHEET.md.

## Assessment and validation
Review evidence discipline, explicit assumptions and proportional recommendations. There is no approved pass threshold, organizational remediation SLA or automated priority engine. No numeric severity scores are supplied for the fictional cases. The paper exercises and reviewer interpretations have not been calibrated with learners. Existing publication gates and course permissions remain unchanged.

Source: FIRST CVSS User Guide, https://www.first.org/cvss/user-guide . Its severity-versus-risk distinction informs this lesson; no FIRST endorsement or certification is claimed.

## Expanded teaching: recommend the next decision without inventing a risk score

This supplement uses only the existing fictional triage cases. It adds no score calculation, remediation deadline, production inspection or permission to patch a service. No numeric severity scores or vectors are supplied by the case pack.

### Keep three questions on separate lines

Severity asks about the technical characteristics of a vulnerability. Priority asks which decision or action an organization should take next in its circumstances. Confidence asks how well evidence supports a particular claim. These concepts influence each other, but they are not interchangeable scales.

A statement can have high confidence in a narrow fact and low confidence in a broader conclusion. For example, an installed fixed package can be well supported while the running-code state remains unresolved. Do not assign one confidence label to an entire asset when different claims have different evidence.

### Understand the limits of a Base score

FIRST describes CVSS Base scores as severity rather than a complete risk assessment. The guide distinguishes vulnerability characteristics from threat and environment considerations and requires enough scoring context to understand a published number.

If a real assessment quotes a score, preserve its source, CVSS version, vector and metric grouping when available. A bare number discards important assumptions. Do not transfer a published score from a different product or fill the fictional pack with an invented vector. This exercise asks for reasoned decisions without calculation.

### Bring asset context into the decision

Ask what is affected, who can reach it, what access is required, which feature is involved and which data or service matters. Then ask which controls actually exist, whether a fix is available and what constraints govern an authorized change.

Each answer needs evidence. A component being internal is not automatically a compensating control, and an unverified firewall assertion does not remove an exposure. Conversely, a hypothetical wider impact must not be presented as the asset's supported consequence.

The course asks these questions on paper. It does not authorize collecting real exports, learner records or business metrics to fill the table.

### Compare B and C without pretending they share evidence

Case B supports the fictional advisory's affected conditions for a training-only system with synthetic exports. Case C has insufficient identity and configuration evidence. It is reasonable to distinguish an established applicability concern from a clarification need.

It is not reasonable to assign a universal remediation order solely from those labels. The case pack withholds business context and supplies no scores. If asked for an ordering, name the objective and the assumptions that could reverse it. Clarification may be the next action even when no patch decision is yet justified.

### Case A requires an activation decision, not a success claim

The fixed package is installed, but the documented restart condition has not been met and running-code evidence is missing. A useful owner-facing note highlights that gap and asks for an approved change and verification plan. It does not announce either a completed correction or a demonstrated exploit.

Restarting is an operational change with possible service consequences. The learner cannot perform it merely because the advisory mentions it. Keep the responsible owner, permission, recovery and verification needs explicit.

### Case D permits closure of a narrow match

D's correlated runtime and restart records support the supplied advisory's fixed-build conclusion. A proportional recommendation can close that particular applicability question with its supporting labels and residual limits.

Closing a specific advisory match is not a warranty about all components, configurations or future changes. Retain the evidence basis so a later reviewer can understand why that decision was made and when it needs revisiting.

### Separate a proposed control from a verified correction

A mitigation description is a plan. An approved change record states what was authorized. A retest observation states what was checked afterward. A ticket's closed state is an administrative fact, not automatically technical proof.

For a defensible handoff, identify the original condition, the owner decision, the approved change category, the evidence a future retest would need and the remaining unknowns. The retest must address the original condition rather than substitute an easier observation.

If the evidence required for comparison is absent, say so. Do not manufacture timestamps or successful results to make the report look complete.

### Write the note for the owner who must decide

A short note should let its reader answer three questions: what do we know, what decision is needed and what evidence will show that decision worked? Include applicability, the advisory-level consequence, the supported local context, confidence limits and the next authorized step.

Avoid alarming language that adds host compromise or production impact absent from the pack. Also avoid reassuring language that turns uncertainty into safety. Proportional wording makes both the concern and the evidence gap visible.

### Human-led AI critique

Draft the owner note yourself. If an approved assistant is available, supply only the fictional note and case labels, and ask it to separate severity, priority and confidence claims. Reject invented scores, timelines, business losses or instructions to change a real service. Manual review against the three questions provides the same learning outcome.

### Formative questions with explained answers

1. Can a severe advisory determine operational priority alone? No. Applicability, environment and actual decision constraints matter.
2. Can confidence differ between claims on one asset? Yes. Installed-package identity and runtime correction can have different support.
3. Does a closed ticket verify a correction? No. The relevant technical observation must still be identified.
4. Why preserve the score's version and vector if one is quoted? They communicate the basis and assumptions behind the number.
5. Does this worksheet authorize a restart? No. Operational changes require the actual owner's approval and procedure.

Technical basis: FIRST CVSS User Guide, https://www.first.org/cvss/user-guide . This supplement uses its severity/risk distinction without supplying or calculating a fictional score. No remediation, retest or assessor calibration is claimed.
