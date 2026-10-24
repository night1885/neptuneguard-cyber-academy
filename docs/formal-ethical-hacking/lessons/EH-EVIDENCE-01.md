# EH-EVIDENCE-01 — Reconstruct a timeline without inventing an incident

Draft offline practical, not published. Requires EH-WEB-03, EH-LAB-05 and the Python reading bridge if choosing the code route. Proposed lesson ID only. Students analyse the supplied synthetic dataset on their own equipment; no live logging system is accessed.

## Outcomes
Distinguish event time from collection time, normalize explicit time offsets, identify duplicate delivery, correlate related records and separate an attempted operation from a supported outcome.

## Scope and provenance
Use only fixtures/log-analysis/events.jsonl, relative to docs/formal-ethical-hacking. Every identity, resource, interaction and timestamp is fictional. The date in the records is a scenario date, not an author execution date. No real student, production system, password, token or session value is represented.

JSONL means one JSON object per line. Read this small file as text or parse it with Python's json module; never evaluate it as executable Python. No pip install, sudo, network connection or SIEM is needed. Preserve an unchanged original and work on a copy. Do not substitute real application logs.

## Understand the fields
- event_id identifies a source event in this exercise. Identical copies with the same ID represent duplicate delivery, not separate actions. In real systems, establish the source's uniqueness rules rather than assume all IDs are globally unique.
- event_time is when the fictional source says the event happened. received_time is when the collector says it received that record. Delivery delay can make collection order differ from event order.
- component identifies the emitting subsystem. interaction groups records for one fictional operation; it is not a credential or an authentication session.
- actor identifies the claimed synthetic subject; it does not prove a human's identity or intent.
- event, outcome and resource describe the recorded action and its stated result. null means no resource value is supplied, not that every possible resource is known absent.

## Build the timeline
1. Count raw records without changing the original.
2. Check required fields and parse timestamps as offset-aware values. Preserve original strings and represent your normalized timeline in UTC.
3. Identify repeated event IDs. Compare complete records before treating a repeat as a duplicate. Conflicting records sharing an ID require investigation, not silent deletion.
4. Make a deduplicated analysis view, documenting your rule. Do not remove rows from the preserved source.
5. Sort using parsed event instants, not display-string order. Group by interaction while retaining component and actor context.
6. Compare event and collection order and explain any difference. The pack assumes the stated source times for reasoning but supplies no independent clock-synchronization evidence. Timestamp normalization alone does not prove precise cross-system causality.

For a supported Python installation, `datetime.fromisoformat(value).astimezone(timezone.utc)` can normalize these explicit-offset values after importing datetime and timezone from datetime. It does not deduplicate, establish clock accuracy or correlate identities for you. Do not strip timezone information to make sorting easier.

## Interpret with restraint
A login denial is an observed authentication outcome, not proof of password guessing or malicious intent. A later successful login does not by itself prove that the earlier failure compromised an account. A policy allow decision is not the same event as delivery of a resource. A gateway 200 response is not proof of which bytes a user received or whether every policy condition was correct.

An interaction with a request but no later outcome is incomplete evidence. It is not automatically a successful action, a failed action or proof that records were tampered with. State what is unknown and request the smallest useful additional authorized evidence. Do not access the resource to fill the gap.

## Independent analysis
Prepare a UTC timeline, a raw-versus-distinct count and an interaction summary. Identify an observed denial, an allowed decision and an incomplete interaction, with evidence labels. Explain what the collection delay changes about naive line-by-line interpretation. Propose two competing explanations for incomplete evidence without declaring either proven.

## Privacy and preservation
Real logs may contain sensitive identifiers or secrets. OWASP recommends recording useful when/where/who/what context and interaction identifiers while excluding passwords, access tokens and other primary secrets. Do not respond to that guidance by collecting real logs here. Use only synthetic labels and the approved private submission workflow. A file hash can support byte-consistency checks but does not authenticate the originating system or make the recorded events true.

## Deliverables and review
Use LOG-TIMELINE-WORKSHEET.md. Submit your method, normalized view, duplicate handling, evidence-linked interpretations, gaps and limits. Do not claim a real intrusion or actual exfiltration. Formal scoring, learner calibration, accessibility review and supported guest reproduction remain pending.

Source: OWASP Logging Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html . See LOG-DATASET-VALIDATION.md for bounded author checks.
