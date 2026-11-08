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
