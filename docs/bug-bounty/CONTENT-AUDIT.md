# Bug Bounty consolidation audit

Status: owner-review draft; no repository write or release authorization.
Source snapshot: c2bd1f738bd8649270dccd4a99ce738eaad50101.
Review date: 2026-11-14.

## What was checked

- The connector inventory lists 44 Markdown lesson files.
- The proposed manifest lists all 44 exactly once, in nine named modules.
- Each proposed README lesson link maps to an inventory entry.
- The existing README and three lesson bodies were read for a targeted spot-check. This is not a comprehensive 44-lesson quality or prerequisite audit.
- The notebook builder was tested with a synthetic 44-file local Git repository. The real 44-lesson notebook was not built and is not included in this review bundle.

## Confirmed content issues requiring a separate repair patch

1. README status is stale: it still describes the first two-lesson batch. The proposed replacement corrects the inventory count without declaring academy readiness.
2. rate-limits-and-resource-consumption.md says to complete automation first, while ffuf-bounded-content-discovery.md requires the rate-limit lesson. Replace vague prerequisites with exact lesson identifiers and resolve the cycle before calling the reading order verified. The manifest is a proposed order only.
3. tls-certificate-inspection-with-openssl.md sets SNI and aborts chain verification errors but does not explicitly request hostname verification. Distinguish SNI from identity verification and review adding -verify_hostname for the intended hostname. Its brief output also does not support the full subject/validity collection workflow as currently written; add a suitable offline certificate-inspection step. OpenSSL source: https://docs.openssl.org/master/man1/openssl-s_client/
4. deserialization-boundaries.md prints an HMAC comparison but does not branch on failure before parsing. Replace the illustration with a loader that rejects a tampered value before parsing and assert that the parser was never called. Do not teach that a printed False enforces rejection.

Only README is changed in this consolidation proposal. The other three lesson bodies remain untouched pending an exact repair review.

## Coverage questions, not claims of absence

Review whether each topic has sufficient permitted program-based practice, tool setup instructions, alternative results, evidence limits and cleanup. In particular, distinguish optional offline examples from the primary program-based practice model, and distinguish concepts from reproducible browser/tool demonstrations. Inventory presence is not proof of teaching depth.

## Notebook builder scope

The builder reads existing local Git objects from the manifest's pinned commit. It makes no network requests and executes no lesson code. It refuses an unexpected inventory, duplicate lesson IDs, empty lessons, unclosed fences and an existing output file. It rebases headings outside fenced code and rewrites simple exact lesson links to notebook anchors. Other link formats and heading-fragment links still need a real-content review. Synthetic tests are not full-course delivery tests.

## Before integration

Complete the lesson repair review, check every prerequisite and required tool/version, run the real snapshot notebook build, inspect all links and rendered code blocks, and review the owner's complete Markdown notebook before academy implementation. Preserve existing courses, staging, verification bot and access/progress/grading behavior. PR, merge and deployment need separate approvals.
