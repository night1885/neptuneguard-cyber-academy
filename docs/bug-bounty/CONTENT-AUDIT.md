# Bug Bounty combined curriculum and builder repair review

Review date: 2026-11-14.
Proposal base: eb90a67ceaa44611a9b054b5b0a0e66083e9f8fc.
Status: content and tooling draft; not academy or release approval.

## Included in this batch

- Clarify the allowlist and API inventory prerequisites without requiring later inventory or object-access testing first.
- Move redirect validation after origins, and uploads/server-side requests before their path/XML dependents. Keep all 44 lessons exactly once in nine modules and synchronize README with the manifest.
- Restrict simple lesson-link rewriting to supported Markdown links outside fenced blocks and inline backtick spans. Preserve plain filenames and code examples. This remains a conservative renderer, not a complete Markdown implementation.
- Add a standalone offline unittest suite and clarify self-review/owner-managed capstone feedback without implementing grading or certification.

Three lesson bodies, README, manifest, builder, tests and this audit are proposed: eight files total. The other 41 lessons and all academy/runtime files are untouched. No target practice, PR, merge or deployment is included.

## Validation performed on the proposed files

- Sixteen renderer cases passed, including both previously reproduced literal-rewriting failures, fenced code, inline/multiline code spans, escaped backticks, supported links and unsupported-link preservation.
- Ten unittest methods passed. They cover those renderer subcases plus nine synthetic assembly/input/CLI checks: 44-lesson assembly, working-tree isolation, duplicate rejection, inventory mismatch, empty lessons, course identity, pinned SHA format, unclosed fences and overwrite refusal.
- The allowlist, API inventory and capstone local blocks passed Bash syntax checks and ran offline.
- Nine targeted dependency relationships were checked against the proposed order. All precede their dependents; this is not a full prerequisite certification.
- README has 44 lesson links matching the manifest with no omission or duplication.

These runs use synthetic local inputs, not the real 44 lesson bodies. Previous TLS/HMAC repairs remain in the selected historical source snapshot, but no live TLS, browser, Burp, scanner, jq practical, CI or academy-delivery run was performed here.

## Source-pin and notebook limitation

The manifest intentionally still pins ae047f8a4d0f8289dbba1a4a66699a17c393f560; no future or self-referential commit ID is invented. After an approved combined repair commit exists, prepare a separately reviewed pin update to that known commit. Otherwise the final notebook would omit the new lesson wording even though it uses the new order and renderer.

The actual complete owner-review notebook is not included or claimed built. Its source acquisition, byte verification, assembly, heading/link/code inspection and full-content review remain outstanding. Unsupported Markdown links and unresolved prerequisite labels require manual review. Do not substitute test fixtures for the actual course.

## Before implementation

Review permitted program-based practice depth, tool installation/version instructions, response interpretation, evidence handling and cleanup across all lessons. Preserve existing courses, staging, verification bot and access/progress/grading behavior. No payout or learner acceptance is a release gate. Academy implementation follows complete notebook review; PR, merge and deployment remain separate approvals.
