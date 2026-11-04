# EH-LAB-00 — Authorization and Computer Readiness

Status: draft student lesson; not approved for publication. This is not a live agreement, legal advice or permission to test any system. Community Learning is excluded.

## Learning outcomes
Distinguish technical access from authorization. Identify a lab's exact targets and permitted actions. Recognize stop conditions. Prepare a privacy-conscious computer inventory and explain the next setup gate.


## How to use this lesson
This entry lesson is about making a defensible readiness decision, not installing a tool or testing a target. Work through the sections in order. Your four outputs are the existing scope summary, system-boundary diagram, minimal inventory and seven scenario answers. If information is unavailable, write "not established" and identify who must clarify it; do not turn an unknown into a pass.

Use an accessible text editor or paper for your draft. A labelled text diagram is an alternative to a screenshot or drawing. No scanner, proxy, guest installation, firmware change, network request or credential test is needed for this lesson. Tool installation and tool operation belong to the appropriate later, explicitly authorized practicals; they are not removed from the course.

For each decision use: observation -> boundary -> uncertainty -> next permitted action. Keep the distinction between a fictional case answer and an actual observation of your device. Do not upload personal inventory information until the approved private collection route and retention rules exist.

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
A lab permits GET / and HEAD / only against an identified clean internal peer. A learner suggests scanning a public website while that peer is unavailable. This is a fictional reasoning exercise; do not send a request or run a scanner.

1. Observation: the permitted peer is unavailable; a different reachable website has been suggested.
2. Boundary: permission covers the named peer and two stated request forms, not arbitrary reachable systems or scanning.
3. Uncertainty: the original peer's failure cause and recovery time are not established. Nothing supplied authorizes the substitute.
4. Decision: stop practical activity. Request recovery of the named peer or a reviewed, explicitly authorized alternative through the actual support route.
5. Evidence: retain only a minimal non-sensitive description of the mismatch. Do not invent a successful request or copy unrelated data to make the worksheet look complete.

The useful skill is not always choosing "stop": it is identifying the exact condition that justifies proceeding or stopping. Tool availability and internet reachability do not expand scope.

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
Use the same four draft evidence items already required by this lesson:

| Item | What to demonstrate | If blocked |
|---|---|---|
| Scope summary | Identify target/service, allowed actions, exclusions, time window, stop conditions, evidence rules, support and reset from the actual brief | Name each missing detail; do not guess permission |
| Boundary diagram | Distinguish host, hypervisor, guest, practice peer and external paths | Label an unverified connection as unverified, not isolated |
| Minimal inventory | Supply only the listed non-sensitive fields and distinguish known values from unconfirmed support | Record the unsupported/unknown route without buying, installing or bypassing controls |
| Seven scenario answers | Give a decision plus observation, boundary, uncertainty and next permitted action | Explain the blocker instead of fabricating output |

Draft feedback should identify the specific missing reasoning or unsafe assumption and request a targeted correction. Preserve which parts needed guidance; do not report a coached answer as independent performance. The separate instructor author guide supplies proposed dispositions and observable review criteria, not an activated grade or calibrated pass threshold.

Instructor calibration, actual resubmission policy and access decisions remain pending. Reading pages, answering scenarios or checking boxes does not automatically establish readiness, grant access or issue an award.

## 9. Next lesson gate
Proceed to EH-LAB-01 only when installation permission, a validated supported route and the course's actual support/incident procedures are available. Do not buy hardware or subscribe to hosted services merely to satisfy an unfinished draft. Terminal commands in authorized practical lessons remain subject matter; the no-slash-command requirement concerns learner-interface navigation. The intended delivery uses buttons and an in-place private workspace without modal navigation, but that architecture is not yet implemented.

## Publication blockers
Approved authorization and incident policies; real support contacts; privacy and retention review; tested hardware/platform routes; independent review/calibration of the proposed instructor rubric; accessible private delivery; reviewed identity and course-authorization adapters. The manifest remains draft-not-published. No course activation, real learner decision, lab spending or production change is authorized by this file.
