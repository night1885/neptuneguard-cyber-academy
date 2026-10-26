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
