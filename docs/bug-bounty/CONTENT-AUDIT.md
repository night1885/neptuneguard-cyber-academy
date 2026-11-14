# Bug Bounty content audit and targeted repair review

Status: content remains under review; no academy or release approval.
Original audited lesson snapshot: c2bd1f738bd8649270dccd4a99ce738eaad50101.
Repair proposal base: a8b5735a90c6f8805ab3142c3167e18ca794e154.
Review date: 2026-11-14.

## Original findings and this repair scope

- The old two-lesson README was replaced in the consolidation commit. The manifest contains all 44 lessons exactly once in nine modules. Inventory presence does not establish teaching depth.
- The resource-limit lesson referred to automation as a prerequisite, while ffuf required the resource-limit lesson. This repair replaces that vague reference with four explicit earlier lessons and places automation after the resource-limit lesson. It does not certify the full prerequisite graph.
- The TLS command set SNI without explicit hostname verification, and brief output did not supply its promised certificate fields. This repair adds -verify_hostname, keeps -verify_return_error, bounds the connection attempt with GNU timeout, and separates certificate extraction and local x509 inspection from verification diagnostics. SNI and identity verification remain separate concepts.
- The integrity example printed a failed comparison without enforcing a gate. This repair raises before parsing on failure and asserts that all rejected cases add zero parser calls.

Only three lesson bodies and this audit are in the repair proposal. The other 41 lessons, README, manifest, builder, runtime and existing courses are unchanged.

## Targeted validation actually performed

- Four shell blocks passed Bash syntax checks.
- Three local blocks ran: resource-limit arithmetic, fixed-date arithmetic and the revised integrity gate.
- Integrity controls: valid data parsed once; tampered body, wrong tag and unsigned malformed JSON were rejected with zero additional parser calls.
- Using OpenSSL 3.5.5, a synthetic local certificate/transcript supported PEM extraction and display of subject, issuer, validity and SAN.
- Local verification accepted the matching hostname, rejected another hostname and rejected a time before the certificate became valid.
- Temporary fixture keys and certificates were not retained as deliverables.

No live handshake, browser/Burp workflow, program testing, full 44-lesson audit, CI, academy integration or deployment was performed. Local certificate checks are not a live s_client reproduction.

## Notebook source pin and outstanding build

course-manifest.json now pins ae047f8a4d0f8289dbba1a4a66699a17c393f560, the committed lesson snapshot containing the three targeted repairs. The nine modules, 44 lesson identifiers and their order are unchanged. This metadata follow-up changes only the manifest source_commit and this audit section; it does not modify any lesson or builder.

The actual 44-lesson notebook has not yet been assembled or inspected. The pin selects the repaired inputs; it is not evidence of successful assembly, complete content review or academy readiness. Run the real pinned build and review the resulting complete notebook before academy implementation. No notebook is published by this update.

## Remaining checks before implementation

Review every prerequisite, tool/version requirement, permitted program-based exercise, alternative result, evidence limit and cleanup step. Run the real pinned notebook build and inspect rendered headings, all links, code fences and complete content. Synthetic builder tests are not full-course delivery tests. The owner's complete Markdown notebook must be reviewed before academy implementation. Preserve Ethical Hacking, staging, verification bot, access, progress and grading behavior. PR, merge and deployment each require separate approval.

## Technical references

https://docs.openssl.org/master/man1/openssl-s_client/

https://docs.openssl.org/master/man1/openssl-x509/

https://portswigger.net/web-security/deserialization
