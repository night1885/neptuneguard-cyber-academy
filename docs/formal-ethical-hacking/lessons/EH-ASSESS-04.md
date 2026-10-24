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
