# Instructor review and offline report checker

Maintainer draft. This file name is not access control; a repository reader may see these notes. Separate learner handouts for clarity, not as a claim of protected answers. No learner release, merge, activation or award is implemented.

## Review the first practical
Use FIRST-PRACTICAL.md with the existing LEARNER-VALIDATION.md and blank PRACTICAL-REPORT.md. Require actual supported setup, transfer, support/recovery, private evidence and activity approval before a human run. A missing gate is a legitimate BLOCKED result, never a reason to install/elevate or bypass protection.

Selected expected policy: home/own-note 200; other/missing-note 404 without the other fictional private note. The fixed actor is not a login. Assess whether the learner separates object identity from permission, status from body evidence, actual observations from predictions, and normal denial from a vulnerability finding. The paper defect should identify omission of ownership enforcement and a corresponding failing/repaired assertion, without editing the served site. Do not convert this into a numerical pass band, certification-readiness claim or automatic progression.

## Inspect an actual author browser report offline
Obtain the real browser-smoke-report.json through the approved GitHub/artifact route and preserve its commit/job association separately. From the reviewed fixture directory:

    python3 -B validate_browser_report.py browser-smoke-report.json

The checker reads one explicitly supplied regular local UTF-8 JSON file, at most 65536 bytes; rejects duplicate keys/nonstandard constants; and checks this candidate's flags, positive integer UID, Python 3.12 patch string, Playwright 1.64.1 pin, Chrome/sandbox request, two ordered 21/4 sessions, exact response-status sequences and normal SIGINT/no-forced-cleanup flags. It performs no HTTP, browser/launcher start, URL following, code evaluation or learner-state change. Exit 0 means structurally consistent; 1 means inconsistent; 2 means usage/read/parse failure. Output always includes provenance_verified:false and never prints the raw report.

A forged report can satisfy every check. The checker authenticates neither GitHub origin, commit/job linkage, version truth, executed requests, effective sandbox layers nor learner readiness. Match the real run and source separately. It does not inspect an artifact automatically or replace review of actual logs. The positive test fixture is deliberately invented and labelled FICTIONAL-TEST-BUILD, not a supplied successful CI report. This is a bounded consistency utility, not general forensic acquisition, path-containment or hostile-file hardening.

## Checkpoint for this batch
At 3d9451329ad6cf1146e01ebeb6d24b8fa7812b1f all three named GitHub checks reported completed/success:
- Offline: https://github.com/night1885/neptuneguard-cyber-academy/actions/runs/40251955131/job/121345605058
- HTTP: https://github.com/night1885/neptuneguard-cyber-academy/actions/runs/40251955104/job/121345604990
- Browser/CLI: https://github.com/night1885/neptuneguard-cyber-academy/actions/runs/40251955103/job/121345604869
The successful browser raw report/logs have not been inspected in this batch. Only 15 new checker methods were run locally, using invented data and offline checker CLI subprocesses; no new browser, app launcher or listener ran. The original/combined suites and new CI command were not rerun locally. Read new job results after commit; prior greens do not validate this new batch.

## Distribution and remaining work
The review ZIP contains proposed additions, not a self-contained runnable application or released course. Learner handouts require the separately reviewed application/worksheet materials and actual setup approval. Application, browser/HTTP scripts, root/sandbox guards and live scopes are unchanged; only the offline named test allowlist gains the checker suite. Human hardware/browser/accessibility/pilot review, support/evidence handling and intentionally vulnerable practicals remain separate milestones. No external/company testing, public hosting, runtime/catalogue integration, Discord/Render/PostgreSQL change, grade or award is introduced.
