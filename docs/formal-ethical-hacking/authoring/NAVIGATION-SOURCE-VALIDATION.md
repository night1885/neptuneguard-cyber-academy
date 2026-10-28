# Navigation candidate: committed-source and offline SDK validation

Preparation base: 8a3f4140c981e8c85b0677f35048c476dbbbc63a on feat/formal-first-journey-navigation. The navigation candidate stays default-off and unconnected. This validation slice changes no candidate module, startup import, course registry, schema, environment flag, publication status or PR #36.

## Validation layers
- Existing candidate file: 38 previously executed local cases, rerun by the proposed CI command.
- formal-first-journey-source.test.mjs: one allowlist check and ten actual-document checks. The loader must preserve every UTF-8 source byte across bounded pages, preserve page metadata, and reject the first out-of-range cursor. Diagnostics record document key, byte/page counts and SHA-256, never learner data. These tests read the actual checkout, not replacement lesson text. They do not execute lesson commands.
- formal-first-journey-compatibility.test.mjs: ten offline cases using the installed discord.js 14.27.0 Client/MessageComponentInteraction/Message objects and component builders. A callback-only REST stub and original-message edit stub replace transport; other REST operations throw. The actual authorization lifecycle and acknowledgment code feed the candidate's authorizer through a scripted pool, with no real database or mutation. Tests cover private entry/update, foreign actor, revocation, supplied course allowlist, incomplete account acknowledgment, agreement mismatch, expiry/re-entry and callback failure. One composed test traverses the first page of all ten actual allowlisted documents through those SDK objects. The separate source checks cover every text chunk.

## Existing CI extended, not replaced
The consolidated workspace workflow keeps its Node 20/22 matrix, permissions, checkout/install options, timeout, concurrency and every existing startup/runtime/detached/synthetic/SDK regression step. This slice adds the navigation branch, relevant file triggers and one serial test step. No new workflow, database service, bot login or separate workflow dispatch is introduced. Existing pinned-SDK checks remain in place.

## Preparation evidence, not execution success
Both new JavaScript files passed local syntax checks. Workflow YAML parsed; structural comparison confirmed only the intended triggers and appended step changed. New actual-source and installed-SDK cases have NOT executed locally. The original 38 cases were not rerun in this preparation turn. CI results for the exact uploaded head must be inspected before claiming successful validation. No independent review is claimed.

## Important evidence boundaries
The real service code is tested with a legacy account-acknowledgment-shaped fictional row and a test-only supplied course allowlist. This does not register the formal course, migrate/validate production tables, query PostgreSQL or prove live authorization. Current registry/allowlist/schema approval remains required. SDK membership is stubbed and REST never reaches Discord. Actual SDK object compatibility is not live permissions, privacy, interaction-timing or deployment evidence.

Byte preservation is not readable Markdown, instructor-content review, safe instruction continuation, exercise authorization, hardware reproduction or accessibility acceptance. Odd fence-marker counts are logged as a non-gating heuristic, not a Markdown parser or pass on formatting. Any observed formatting problems remain delivery blockers to review; source tests passing must not erase them. A real provider may accept an edit after the final local access check; these tests do not claim distributed atomic revocation, retroactive message erasure, durable sessions or report retention.

The proposed CI commit authorizes source validation only. No PR, merge, deployment, Render action, connected/live database operation, Discord publication, real learner collection/deletion, evidence intake or reviewer activation is authorized. Additional writes need separate exact approval.
