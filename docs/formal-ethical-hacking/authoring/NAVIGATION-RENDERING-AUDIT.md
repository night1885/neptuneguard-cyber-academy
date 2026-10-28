# Draft lesson rendering audit and observable CI findings

Prepared against main b80edca7a870461c82247db04186d921df76e093 after PR #37 post-merge Node 20/22 jobs passed. This batch adds maintainer diagnostics only; the navigation candidate remains default-off and unconnected.

## Purpose and scope
The current source tests establish byte preservation, not readable or safe pagination. Raw CI log retrieval was unavailable. This proposed package reports per-document pagination and local-link findings in both a job summary and bounded warning/notice annotations, without logging source bodies or fetching external links.

formal-render-audit.mjs reads only the ten existing allowlisted source documents through the unchanged actual loader. It checks bounded envelopes and exact UTF-8 preservation, reports cuts inside recognized backtick/tilde fences, midline cuts, UTF-16 surrogate cuts, unclosed source fences and simple inline Markdown links. Link targets are checked for local existence/containment using realpath; external/fragment URLs are counted but never fetched or validated. Existing relative files are still delivery-review items because existence does not make a Discord navigation route. No linked target body is read.

formal-render-audit-cli.mjs emits one metadata-only annotation per document and appends a Markdown table to the CI-provided summary file only when GITHUB_ACTIONS is true. Integrity failure exits nonzero with a neutral message. Findings are review warnings, not automatic release failures or approval. The summary explicitly requires human acceptance even when the bounded parser finds nothing.

The test file has 31 locally passing top-level tests under Node 20.20.1, zero failures/skips. It uses fabricated text and temporary ten-document checkouts with a byte-verified copy of the existing loader (Git blob 31195cc57cd194e047ed95ee6a3d12e344d1e8ee), including child-process CLI tests. It verifies actual loader behavior on those fixtures, summary writing, containment and no source-body disclosure. It does NOT establish findings for the real repository lessons. Actual-document audit output remains pending until reviewed CI execution on the proposed head.

## CI proposal
Add feat/formal-rendering-audit to the existing consolidated workflow push branches; append the audit tests and audit CLI. Existing formal-*.mjs filters already cover these files. Keep all prior steps, Node matrix, permissions, dependencies, timeout and concurrency unchanged. Run the audit CLI when not cancelled so earlier test failures need not hide source findings; its success cannot erase an earlier failure. Workflow YAML/settings comparison passed locally. No new service, API client, credentials, artifact upload, database or bot startup is introduced.

## Limitations and next acceptance
This is a bounded fence/link heuristic, not a complete CommonMark/Discord parser. It deliberately does not claim inline-code exclusion, nested/escaped-link parsing, indented/blockquoted fences, working anchors, educational context, instructor-content review, live formatting, hardware reproduction or accessibility acceptance. Offsets are UTF-16 source positions, not byte offsets. Source and link containment assume a trusted stable checkout, not an adversarial filesystem sandbox. External links are not approved merely because counted. Code snippets are never executed. Diagnostics report source metadata only, not learner data.

After CI, read per-document annotations/summary and propose the smallest necessary rendering or routing fixes together with regressions. Do not silently modify lessons, suppress findings or treat a green job as permission to deliver content. No real-document findings, formatting fixes or release readiness are claimed by preparing this audit.

No repository write, branch creation, PR, merge, deployment, Render operation, Discord action, database access, collection or deletion occurred in this local preparation. Those external actions require their own exact approvals. This batch changes neither content nor navigation/runtime policy. Existing report-retention and live-activation gates remain in force.
