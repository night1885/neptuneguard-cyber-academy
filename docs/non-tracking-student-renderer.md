# Non-tracking student renderer — staged content layer

Status: repository preparation only. No runtime hookup, live data/configuration, migrations/grants, course completion, credential issuance, deletion, merge, deployment, or activation occurs in this patch.

The pure renderStudentCoursePage function receives courseKey, bounded cursor, and a session-bound button-ID builder. It renders only selected teaching fields: overview/objectives, key ideas, command examples, lab safety/commands/checks, hints, and practice questions. It takes no learner identity or database pool and imports no progress writer or executable legacy handler. It must be called through protected navigation; it is not itself an authorization check.

Module 1's registry record contains metadata rather than its teaching text. A data-only bridge copies its existing legacy entry-point instructions/question, without importing that entry point or copying XP/completion behavior. Existing registry fields override the bridge when supplied. The registry is not mutated. Other modules use their registered data.

Practice questions initially show question text and answer labels, not correctness flags or explanation objects. Choosing an answer returns feedback for that request only; no attempt, answer history, score, progress, grade, XP, badge, course completion, or certificate is stored or awarded. Discord/provider message retention remains a separate matter; this is not a zero-retention promise.

Only same-session page controls are generated. Module/page/answer bounds and view-specific cursor rules are checked. Text is paginated, controls are bounded, and mentions are disabled. Lab pages show practice instructions only, not lab authorization or execution.

The viewer describes curriculum order/prior-module suggestions but does not assert or certify prerequisite completion from saved progress. Final curriculum/safety review must decide whether any material requires additional explicit authorization before exposure; do not infer that read-only presentation alone makes every lab appropriate.

studentCourseContentGaps reports missing teaching fields and unsupported quiz structures for operator review. Missing views show an explicit unavailable-content message rather than invoke legacy handlers or invent teaching material. The test suite exercises bounded rendering for registered modules but does not assert that the entire curriculum has no gaps. Content-completeness and safety review remain release gates.

Unit tests cover the Module 1 bridge, all registered module views, registry non-mutation, question/feedback separation, invalid cursors, content-gap structure, output bounds, and absence of legacy/database writer imports. No new passing CI results are claimed before execution.

Still required: course readiness/restricted-role verification, default-off runtime composition with protected navigation, confirmed admin assignment/completion controls, combined PostgreSQL acceptance, retention deletion/provider handling, final documents and target-environment acceptance.
