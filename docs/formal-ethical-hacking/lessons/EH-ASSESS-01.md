# EH-ASSESS-01 — Turn authorization into an assessment plan

Draft lesson, not published. Requires EH-NET-CAPSTONE and EH-LAB-05. Proposed ID only; no runtime registration. Student-built clean guests remain the practical environment.

## Outcomes
Translate an objective into a minimal test plan, distinguish discovery from vulnerability validation, and document the conditions that require stopping.

## Start with the question
An assessment should answer a defined question rather than run every tool available. For this teaching sequence the question is: can the authorized learner establish a TCP connection to the clean peer's intended service endpoint, and how does that observation change when the service is stopped? That is narrower than finding every service or proving the peer secure.

Inventory identifies assets and configuration. Discovery observes reachable systems or services. Vulnerability analysis compares evidence against applicable security expectations. Validation investigates a specific weakness under an agreed scope. Reporting communicates evidence, consequences, limitations and recommended action. These activities relate to one another but do not grant permission for the next automatically.

## Write the plan before execution
Record objective, authorizing authority, learner and target identity, permitted protocol/port/actions, environment, time window, maximum invocations, excluded techniques, evidence handling, stop conditions, support contact and recovery procedure. Identify which facts are confirmed and which are assumptions.

A private address, installed scanner or student-owned machine is not a substitute for the course's actual authorization and device/network permissions. A draft exercise cannot establish legal authority or override managed-device policy. If the authority, contact or network boundary is missing, prepare the plan but do not execute.

## Proposed local exercise scope
For EH-ASSESS-02 only, the proposed target is the known clean NG-Peer at 192.0.2.20, TCP port 8000, from NG-Learner on NG-FOUNDATION. This is a new draft exercise scope, not retroactive permission to scan during earlier GET/HEAD-only lessons. It needs approval as part of the actual released lab brief.

The proposed scan type is a TCP connect check. Only two planned Nmap invocations are included: one with the teaching service running and one after it is stopped. No subnet ranges, public targets, additional ports, UDP, scripts, version probes, OS detection, credential checks, exploitation, spoofing or evasion are included. Local link-layer address resolution may still occur to reach the peer; a one-port scan is not literally one network packet.

## Plan a meaningful comparison
Keep target, interface, command and ordinary account consistent. Change only the documented service state. Correlate the learner observation with peer-side listener state. If unexpected behavior occurs, do not change several variables at once or broaden the target list. Record the ambiguity and choose the next authorized local observation.

Stopping a service is a controlled teaching transition, not remediation of a demonstrated vulnerability. In a real assessment, whether a service should exist depends on policy and business need. Do not frame every reachable service as a defect.

## Independent work
Write a one-page plan for the exact two-state exercise. Explain why an unqualified scan command, a default set of ports and a version-detection option do not match the proposed scope. State what evidence would answer the question and what would remain unknown even if the two observations matched expectations.

## Assessment and limits
Review objective/scope alignment, bounded methods, evidence needs and stop decisions. No scan execution is required by this planning lesson. Publication, supported-host testing, assessment calibration and actual support/incident policy remain pending.

Source: NIST SP 800-115, https://csrc.nist.gov/pubs/sp/800/115/final . It supports planning, analysis and reporting concepts; it does not endorse this course or certify the lab.

## Expanded teaching: make the plan so specific that it can be wrong

This supplement is planning guidance for the existing two-state exercise. It adds no scan, no command and no change to earlier lessons' request limits. EH-ASSESS-02 and its approval remain separate. Everything here is a paper exercise about writing a plan, not authority to run one.

### Begin with a question that has a checkable answer

The lesson's question has two parts: can the authorized learner establish a TCP connection to the intended endpoint, and how does that change when the service is stopped. A good question names a subject, an observation and a comparison. It can be answered yes or no for each state and does not promise more than that.

Contrast it with weaker objectives such as finding anything interesting or checking that the peer is secure. Those cannot be answered, so they cannot guide scope, method or stopping. NIST SP 800-115 frames assessment as planning, executing, analyzing findings and developing mitigation, with the plan defining what is examined and how results will be used.

### Separate the five activities and their permissions

Inventory records what exists. Discovery observes what is reachable. Vulnerability analysis compares evidence with expectations. Validation investigates a specific weakness under agreed scope. Reporting communicates evidence and limits. Completing one does not authorize the next. A learner who has discovered that a port is reachable has not been given permission to probe the service behind it.

Write that boundary into the plan as a sentence per activity: what is in scope, what is excluded and who can change the scope. In this exercise only the narrow connection check is proposed; version probing, scripts, other ports and credential checks are explicitly excluded.

### Fill the plan fields so each is verifiable

For each field in the lesson's list, ask what would prove it. The authorizing authority needs a name or role and a record, not an assumption that a course implies permission. The target identity needs the addresses and the learner machine named. The permitted action needs the protocol, port and method. The maximum invocations number is two in this exercise, and the plan should say that a failed or ambiguous attempt still counts toward it. The time window, evidence handling and recovery procedure each need a concrete statement.

Mark every item as confirmed or assumed. An assumption that cannot be confirmed is a reason to stop before execution, not a detail to carry silently. A private address, an installed tool or a student-owned machine does not replace actual authorization and device or network permission.

### Define stop conditions before they are needed

A stop condition is a rule that turns an uncertain moment into a clear action. Examples to write in your plan: the target identity does not match the plan, the observed behavior is unexplained, the number of planned invocations has been reached, or the authority or contact cannot be confirmed. For each, say what you will do instead: stop, preserve what you have and ask the named contact.

Equally, write what you will not do. Do not widen the target list to explain a surprise, and do not change several variables at once.

### Design the comparison so a difference means something

The plan changes one thing: the documented state of the service. Keep the target, interface, command and account constant, so that fewer alternative explanations compete with the documented state change. This comparison does not by itself prove a unique cause for every unexpected result. Pair the learner-side observation with the peer-side listener state, since the two together answer the question better than either alone.

Decide in advance what outcomes you expect and what each would mean. A connection that is accepted when the service runs and refused or unanswered when it is stopped supports the expected story. Refused and unanswered are distinguishable observations and may point to different explanations, so record which you actually saw rather than collapsing them into closed. If the observations do not match expectations, the next step is a smaller authorized local observation, not a broader scan.

### State what the evidence will not show

Even a clean match leaves most questions open. It does not show that the peer is secure, that other ports are closed, that the service is correctly configured or that the same result would hold from another position on the network. A one-port check also is not a single packet; local address resolution can occur. Write these limits into the plan so that the eventual report cannot overreach.

Stopping the service is a controlled teaching transition. It is not remediation of a demonstrated weakness, and a reachable service is not automatically a defect. Whether a service should exist depends on policy and need.

### Common errors to avoid in the one-page plan

An unqualified scan command, a default port set and version detection each go beyond the proposed scope. Explain in your plan why each does. A plan that lists tools without a question, or a question without stop conditions, is incomplete. A plan that cannot be wrong cannot be reviewed.

### Bounded human-led AI review

Write your own plan first. If an approved assistant is available, provide the fictional plan text only and ask it to identify any field that is an assumption, any step that exceeds the stated scope and any conclusion the evidence could not support. Reject suggestions to add targets, run extra checks or use real addresses. Manual review by checking each field against the lesson satisfies the same objective.

### Formative questions with explained answers

1. Why is a stated question better than a tool list? It defines what evidence would answer it.
2. Does discovery authorize validation? No. Each activity needs its own agreed scope.
3. Does a failed attempt consume an invocation? In this plan, yes, so the limit stays bounded.
4. Why change only the service state? Then a difference can be attributed to it.
5. What would matching observations still leave unknown? Overall security, other ports and other vantage points.

Clarification on causal interpretation: changing only the documented service state reduces competing explanations and makes the comparison more informative; it does not by itself prove causation. Correlate the learner-side observation with the peer’s listener state, and preserve uncertainty about unobserved changes.

Technical basis: NIST SP 800-115, https://csrc.nist.gov/pubs/sp/800/115/final . It supports planning, analysis and reporting concepts; it does not endorse this course. No scan, network observation or learner-platform execution is claimed by this supplement.
