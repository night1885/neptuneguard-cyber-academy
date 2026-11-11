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

## Expanded teaching: reconstruct the supplied sequence, not an imagined attack

Use only the existing synthetic JSONL file. This supplement adds no log source, live-system query, incident response action or personal data collection. The timestamps and identities are scenario facts, not today's date or observations of academy users.

### Preserve two views of time

Event time is the source's statement of when something happened. Received time is the collector's statement of when that record arrived. Neither should silently replace the other. Keep the original timestamp strings and build a normalized analysis view rather than editing the source.

Explicit offsets allow a common UTC representation. A local-looking clock value with a negative four-hour offset represents an instant four hours later in UTC. Removing the offset changes the meaning of the data; sorting display strings can also produce the wrong order when offsets differ.

Normalization makes instants comparable under the supplied clock assumptions. It does not independently prove the clocks were accurate or synchronized. Retain that limitation even when the resulting table looks neatly ordered.

### Worked offset comparison — FICTIONAL

L03 states 08:15:10 at offset minus four hours, equivalent to 12:15:10 UTC. L04 states 12:15:10.100 UTC and L05 states 12:15:10.200 UTC. Under those supplied times, the policy event sits between the request event and the response event.

Their arrival order differs: L05 reaches the collector before L04. That can be explained by differing delivery delays without changing the supplied event sequence. It is not, by itself, proof that the application responded before the policy decision or that a record was forged.

When discussing the relationship, cite the event IDs and say that the comparison uses supplied timestamps. Do not claim you measured actual inter-system latency.

### Deduplicate delivery without deleting history

The file contains repeated copies of L02. Compare the complete records before classifying the repeat. The supplied copies agree, so an analysis view can count that event once while the raw source retains both deliveries.

The exercise uses source-event IDs with stated duplicate semantics. Real systems can use identifiers with different scopes, so the technique is not a universal rule to drop every repeated ID. Conflicting records sharing an ID would need their own unresolved-evidence note rather than silent selection of a preferred version.

Report both raw and distinct-event counting units. A raw line count is not automatically a count of independent user actions, and a deduplicated event count is not automatically a count of interactions.

### Correlate by interaction and component

R03 groups the supplied request, policy denial and gateway response. Those records describe different stages of one fictional operation. Do not count them as three independent attempts simply because three components or event types appear.

R05 includes an allowed policy decision and a gateway 200. That supports those recorded outcomes but not the exact content delivered, correctness of every policy condition or identity of the human behind the synthetic actor label. An interaction identifier is a correlation aid, not a session credential.

Keep the subject, resource and component beside each event. Grouping solely by actor can merge unrelated operations and lose the distinction between a denied login, a later allowed login and subsequent resource actions.

### Work the incomplete interaction without filling it in

R04 contains a request record without a supplied later outcome. That means the provided evidence is incomplete for its result. It does not establish success, denial, malicious deletion or a collector outage.

Two possible explanations could be a later event outside the supplied excerpt or a missing record in collection. Label them alternatives, not facts. The useful next evidence category would be an authorized correlated record from the responsible source, but this exercise grants no access to retrieve it.

Do not fetch the resource or repeat the operation to determine what happened. That would be new activity, not reconstruction of the historical supplied record.

### Separate an authentication outcome from intent

A denied login followed by an allowed login does not prove credential guessing or account compromise. A mistyped value and a legitimate retry are also possible in general, but the pack does not establish either explanation. The proper conclusion names the recorded outcomes and the missing intent evidence.

A label such as student-a is an invented actor field, not verified attribution to a real person. Avoid turning a timeline into an incident accusation by replacing record language with attacker language unsupported by the data.

### Preserve the analysis method

Describe the parsing method, required-field checks, duplicate rule, UTC normalization and grouping rule. Note any malformed or conflicting record instead of silently repairing it. A clean final table should be reproducible from the unchanged original and the documented transformations.

The JSONL file is data, not Python to evaluate. The original lesson's code route uses standard-library parsing only. This supplement adds no reader program, command or package installation.

### Human-led AI critique

First write your own R03 and R04 summaries. If an approved assistant is available, provide only those synthetic records and ask it to identify supported sequence, missing outcomes and any claim of intent that exceeds the data. Reject invented records, exact clock-accuracy claims or requests for real logs. Manual comparison with the source fields is equally valid.

### Formative questions with explained answers

1. Why can received order differ from event order? The records can arrive after different delivery delays.
2. Does UTC normalization prove synchronized clocks? No. It converts supplied instants under their assumptions.
3. Why keep the duplicate in the original? Preservation and analytical deduplication are different operations.
4. Does R04 establish that the request failed? No. Its outcome is not supplied.
5. Does a gateway 200 identify delivered bytes? No. The response status is narrower than content evidence.

Technical basis: OWASP Logging Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html . Examples refer only to the reviewed synthetic dataset. No live log analysis, intrusion finding or learner workflow execution is claimed.
