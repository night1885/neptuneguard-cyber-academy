# Start here — first practical journey

Draft orientation for a proposed student journey, not an activated course, installation approval or testing permission. The complete path has not been reproduced on supported student hardware. Community Learning and academy-hosted labs are outside this route. Do not purchase equipment or services to satisfy unfinished guidance.

## What you are working toward
Explain the authorization boundary, prepare two clean student-owned guests, observe the permitted HTTP requests, stop the service and report what actually happened. This is protocol observation, not a vulnerability hunt. A blocker report is more useful than invented success.

## Gate 0 — permission and support before installation
Read [EH-LAB-00](lessons/EH-LAB-00.md). Identify the actual current lab brief, target, allowed actions, time window, exclusions, stop conditions and support contact. Course admission is not general testing permission. Installation on a managed device requires its owner's approval.

A validated setup route matching your host OS and CPU architecture, actual support/incident instructions and an approved private evidence workflow must be available before a practical pilot. These drafts do not provide those operational services. If any is missing, stop at planning and record the blocker; do not improvise a public submission channel.

## Gate 1 — clean offline learner guest
Follow [EH-LAB-01](lessons/EH-LAB-01.md) for the reviewed virtualization route, then [EH-LAB-02](lessons/EH-LAB-02.md) for verified media, the clean guest and baseline. Record actual versions and resources rather than assuming universal minimums.

Check every adapter and unnecessary integration channel before boot. Later work needs Python 3 and curl. If either is missing, request the reviewed provisioning route; do not attach NAT or bridging to make the exercise work. Software preparation and offline practical work are separate phases. A baseline snapshot is not proof that restoration works.

## Gate 2 — terminal foundations
Read [EH-LINUX-01](lessons/EH-LINUX-01.md), [EH-LINUX-02](lessons/EH-LINUX-02.md) and [EH-LINUX-03](lessons/EH-LINUX-03.md) before the networking practical. Be able to distinguish the host from each guest, identify the current directory, protect a file, and distinguish output, error output and exit status. Ask for clarification rather than typing commands into an uncertain machine.

## Gate 3 — two guests and controlled recovery
Follow [EH-LAB-03](lessons/EH-LAB-03.md). Its proposed environment is NG-Learner 192.0.2.10/24 and NG-Peer 192.0.2.20/24 on the same internal network, NG-FOUNDATION. These addresses do not independently grant permission.

Inspect both guests' adapter, address and route state, including IPv6. Explain discrepancies before continuing. Perform only the lesson's approved bounded checks and controlled recovery exercise. A failed ping does not prove isolation; do not probe the internet or physical LAN as an alternative test. Recheck the configuration after restoring a baseline.

## Gate 4 — observe the authorized HTTP service
Use [EH-LAB-04](lessons/EH-LAB-04.md), not a different internet tutorial. Its client scope is GET / and HEAD / on NG-Peer TCP port 8000. The peer serves only the disposable clean exercise directory. No scanning, credential testing, path enumeration or uploads are added by this orientation.

Record actual listener state, the two client observations and relevant peer log entries. Stop the server using the lesson's procedure, inspect the listener again and make the permitted stopped-service observation. Do not treat a response header as proof of a vulnerability or a timeout as proof of isolation.

## Gate 5 — explain and review
Complete the [first-practical worksheet](FIRST-PRACTICAL-WORKSHEET.md) and use [EH-LAB-05](lessons/EH-LAB-05.md) for reporting. Keep observations, interpretations and unresolved questions separate. Report the steps you actually performed, including failed or blocked steps. Fictional analysis must be labelled FICTIONAL.

Keep personal records out of this repository. Submit only through the actual approved private workflow after its access and retention rules are established. Reviewer feedback does not automatically grant progression, restricted-lab access or an award.

## Stop rather than work around a boundary
Stop for unclear permission, unexpected connections or routes, failed media verification, unknown command destination, exposed secrets, unsupported hardware or unstable operation. Preserve only necessary non-sensitive observations and follow the actual incident/support procedure. Do not test exposed credentials or erase evidence to hide an error.

For later reading, return to the [draft curriculum index](README.md). Maintainers should use the [pilot checklist](authoring/FIRST-JOURNEY-PILOT.md) before claiming this route is reproducible.
