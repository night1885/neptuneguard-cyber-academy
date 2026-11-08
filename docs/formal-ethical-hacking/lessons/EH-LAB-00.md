# EH-LAB-00 — Authorization and Computer Readiness

Status: draft student lesson; not approved for publication. This is not a live agreement, legal advice or testing permission. Students build their own authorized labs. Community Learning is excluded.

## Learning outcomes
Distinguish access from authorization; identify exact targets/actions and stop conditions; prepare a minimal host inventory; explain the next setup gate. Admission, assignment, exercise permission and awards are separate decisions.

## 1. Read the actual brief
A course card, Verified role, installed tool or reachable address is not general testing permission. Use the current approved brief. Record its objective, environment and exact peer/service; allowed actions; exclusions; time window; setup checks; evidence rules; support/incident contact; and recovery procedure. Missing details are blockers, not permission to guess. Do not reuse an earlier exercise's scope or infer ownership from a private address.

Planning reference: NIST SP 800-115, https://csrc.nist.gov/pubs/sp/800/115/final . This reference is not endorsement or legal protection.

## 2. Separate the systems
Draw the physical host, hypervisor, learner VM, practice peer and external connections. Label authorized and prohibited paths. A diagram is not a measured isolation test. Clean teaching fixtures do not authorize substitution of a public or vulnerable target.

Obtain installation approval for managed equipment. Do not bypass management, alter a VPN, disable protections or change firmware to force an exercise to work.

## 3. Make a minimal host record
Work on the physical host, not inside a guest, container, WSL session or remote server. Confirm which machine the displayed information describes before copying it.

1. Open the host's existing system-information interface. Record only the OS name/version, CPU architecture and required memory information. Do not copy a whole screen or diagnostic bundle.
2. Distinguish CPU architecture from an OS's 32/64-bit label. Record an established architecture, such as x86_64 or Arm64, or write unknown. A 64-bit label alone is insufficient.
3. Record available storage on the intended VM volume without listing personal files. Record memory availability with its observation time; it is not a permanent capacity guarantee.
4. Record installation permission, restrictions, support needs and whether virtualization availability is known. Inventory does not authorize firmware changes.
5. Compare the exact combination against publisher documentation and the course's actual reviewed route. Publisher-listed support, a documented candidate and a course-tested route are different claims.

| Record | Include | Exclude |
|---|---|---|
| Platform | OS/release and established architecture | Serial number/full system report |
| Resources | Relevant memory/storage | Personal filenames/account details |
| Permission | Present, absent or unresolved approval | Confidential policy documents |
| Route | Exact proposed hypervisor/guest versions and source | Guessed compatibility/purchases |
| Unknowns | Missing support, unmeasured capacity or unclear identity | Invented output/success/timestamps |

No universal minimum or academy-tested configuration is established here. This file collects/stores no answers. Real collection requires approved private access, retention and deletion arrangements; do not create a public submission or machine-readable learner record from this table.

## 4. Reason about capacity
The later exercise uses two VMs simultaneously. Account for the host's own work, both guest allocations, both virtual disks and recovery data. A dynamically allocated disk's maximum and present usage are different quantities. A snapshot is not a separate backup.

Write proposed values beside actual observations and explain the difference. Leave unmeasured values unknown. Wizard defaults are not a validated two-VM resource budget. Stop rather than over-allocate or buy equipment because a draft is unfinished.

## 5. Know when to stop
Stop and clarify unclear targets, instructions, compatibility or permission. Stop and use the actual incident process for sensitive data, unexplained external connections, verification failures or instability. Preserve only necessary non-sensitive observations. Do not test exposed credentials, expand scope, copy extra data or erase evidence to hide a mistake. Missing support/incident contacts are themselves blockers.

## 6. Worked fictional example
A brief permits GET / and HEAD / only against an identified clean internal peer. The peer is unavailable. A public website is not a permitted replacement. Stop and request recovery or an explicitly approved alternative. Reachability and tool availability do not enlarge scope.

## 7. Independent fictional scenarios
Choose proceed within stated scope, stop and clarify, or stop and escalate. Explain the decisive evidence, uncertainty and next permitted action. These scenarios grant no real permission.

1. The identified peer/setup checks match the current brief and the request is explicitly permitted.
2. A scanner is installed, but no target or scanning permission is named.
3. Output contains an apparent password; credential testing is not authorized.
4. A guest has an unexplained connection to the physical home network.
5. A managed computer's installation approval has not been obtained.
6. A readiness screenshot exposes a serial number and personal files.
7. The installation guide does not support the host architecture.

Label fictional reasoning as fictional. Do not manufacture setup completion, output or execution times. Instructor marking/calibration material must remain separate from eventual learner delivery.

## 8. Review checkpoint
Prepare a redacted inventory, boundary diagram, actual-brief summary and reasoned answers through an approved private process, or record an honest blocker. Distinguish observation, proposal and inference. The reviewer should understand the machine, route and uncertainty without receiving credentials or unrelated personal information.

These learner-facing expectations are draft criteria, not calibrated pass bands, runtime states, enrolment approval, exercise permission or an award. Reading/checking boxes does not establish readiness automatically.

## 9. Next gate and publication blockers
EH-LAB-01 requires installation permission, an actual reviewed supported route and real support/incident procedures. Documentation does not replace unperformed hardware reproduction. Do not buy hardware, licences or hosted subscriptions to satisfy an unfinished draft.

The deployed owner-only Discord inspector supports draft review; it is not the finished learner workspace or evidence-submission service. Intended learner navigation remains private and button-driven without slash-command or modal navigation. Commands taught within authorized lessons are subject matter, not interface navigation.

Publication remains blocked on actual policy/support, privacy/retention, supported route reproduction, licensing/provisioning, assessment calibration, accessibility and reviewed learner authorization/delivery. Draft publication metadata remains unchanged. This file authorizes no activation, learner decision, spending or production change.
