# EH-LAB-00 — Authorization and Computer Readiness

Status: draft student lesson; not approved for publication. This is not a live agreement, legal advice or permission to test any system. Community Learning is excluded.

## Learning outcomes
Distinguish technical access from authorization. Identify a lab's exact targets and permitted actions. Recognize stop conditions. Prepare a privacy-conscious computer inventory and explain the next setup gate.

## 1. Understand the boundary
A course card, Verified role, enrolment approval, installed tool or reachable address is not general testing permission. Course admission, specific-course assignment, restricted-lab authorization and formal awards are separate controls. Before any practical action, use the actual approved lab brief and its current scope. If authorization or identity is unclear, stop and clarify.

## 2. Read the lab brief
Write down the objective; authorized environment, target and service; permitted actions; exclusions; setup checks; allowed time window; evidence rules; stop conditions; support contact; and reset procedure. Missing details require clarification, not guessed permission. Do not assume a private IP address belongs to the course or reuse an old exercise's authorization.

Planning reference: NIST SP 800-115 and its rules-of-engagement guidance, https://csrc.nist.gov/pubs/sp/800/115/final . This reference does not imply endorsement or legal protection.

## 3. Separate the systems
Draw your host computer, hypervisor, learner VM, practice peer and external connections. Label authorized and prohibited paths. Later guides must provide tested settings and checks; this diagram alone does not prove isolation. The first practical sequence uses clean course fixtures, not unrestricted vulnerable targets.

If a device is managed by an employer or school, obtain the required installation approval. Do not bypass management controls, disable host protections or use an organizational VPN/network as an improvised lab.

## 4. Prepare a minimal readiness inventory
Record host OS/version, CPU architecture, available memory/storage, virtualization availability, permission to install and relevant restrictions. Do not include serial numbers, passwords, tokens, full unredacted system reports or unrelated personal files. Hardware thresholds and supported routes must come from tested course configurations; none are established by this lesson.

| Field | Student worksheet entry | Limit |
|---|---|---|
| Host OS/version | To complete in approved private workflow | No full system report |
| CPU architecture | To complete | No serial number |
| Available memory/storage | To complete | No personal directory listing |
| Virtualization availability | To complete | No unreviewed firmware changes |
| Installation permission | To complete | No confidential policy documents |
| Restrictions or unresolved issues | To complete | No credentials |
| Supported setup route | Pending validated course guidance | Do not guess compatibility |

This repository document collects and stores no student answers. Real input, access, retention and deletion policies must be approved before collection.

## 5. Know when to stop
Stop when the target is uncertain, the network differs from the approved setup, an unexpected external route appears, an action exceeds scope, sensitive data appears, verification fails or the device becomes unstable. Preserve minimal non-sensitive observations and use the approved support process. Do not expand testing, validate exposed credentials, copy additional data or erase evidence to hide a mistake. If escalation contacts or policy are missing, do not invent them or continue intrusive work.

## 6. Worked fictional example
A lab permits GET / and HEAD / only against an identified clean internal peer. A learner suggests scanning a public website while that peer is unavailable. The website is not an authorized substitute. Stop the practical work and request peer recovery or an explicitly approved alternative. Tool availability and internet reachability do not expand scope.

## 7. Independent fictional scenarios
For each scenario, state whether to proceed within stated scope, stop and clarify, or stop and escalate. Explain the decisive evidence, what remains unknown and the next permitted action. These scenarios grant no real permission.

1. The exact authorized peer and setup checks match the current brief; the proposed request is explicitly permitted.
2. A scanning tool is installed, but no scanning target or permission is named.
3. Unexpected output contains an apparent password; credential testing is not authorized.
4. The guest has an unexplained connection to the physical home network.
5. A managed computer requires administrator installation approval that has not been obtained.
6. A proposed readiness screenshot exposes a device serial number and personal files.
7. The chosen installation guide does not support the host's CPU architecture.

Do not submit invented command output, timestamps or completed setup claims. An analysis of fictional scenarios must remain labelled as fictional and cannot substitute for executed lab evidence. Instructor marking guidance must be protected separately in the eventual delivery system.

## 8. Assessment and feedback
Required draft evidence: non-sensitive readiness inventory, system-boundary diagram, lab-scope summary and reasoned scenario answers. A reviewer should assess scope discipline, uncertainty handling, privacy and sensible next actions. Exact rubrics, resubmission rules and instructor calibration remain pending. Reading pages, answering scenarios or checking boxes does not automatically establish readiness, grant access or issue an award.

## 9. Next lesson gate
Proceed to EH-LAB-01 only when installation permission, a validated supported route and the course's actual support/incident procedures are available. Do not buy hardware or subscribe to hosted services merely to satisfy an unfinished draft. Terminal commands in authorized practical lessons remain subject matter; the no-slash-command requirement concerns learner-interface navigation. The intended delivery uses buttons and an in-place private workspace without modal navigation, but that architecture is not yet implemented.

## Publication blockers
Approved authorization and incident policies; real support contacts; privacy and retention review; tested hardware/platform routes; instructor rubric and calibration; accessible private delivery; reviewed identity and course-authorization adapters. The manifest remains draft-not-published. No course activation, real learner decision, lab spending or production change is authorized by this file.
