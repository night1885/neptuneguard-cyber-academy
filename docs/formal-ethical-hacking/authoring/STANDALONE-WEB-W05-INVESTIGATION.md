# W05 draft — investigate a claim before accepting it

Learner method exercise, not a complete advanced-vulnerability module, calibrated exam or practical permission. W05 is a planning label. Use reviewed in-course foundations and W04 support or assessed equivalent skills; no other preparation-course enrollment is required. Existing practical setup/prerequisites are not waived.

## Brief and scope

A fictional maintainer claims: 'Course membership, SQL value binding and stale-write rejection prevent students accessing or changing another student's information.' Investigate each part separately in the existing read and update teaching applications. Do not generalize one factory's behavior to another factory or a repaired reference.

Use the [existing investigation route](code-review-pathway/03-INDEPENDENT-INVESTIGATION.md), [ownership lab](../lessons/APPLICATION-OWNERSHIP-LAB.md) and [update lab](../lessons/APPLICATION-UPDATE-LAB.md). These are visible familiar exercises, not fresh hidden assessment targets. No listener, scanner, browser, session, account test, PATCH request or external service is introduced.

## 1. Freeze the question and source context

Record exact source revision, starter/reference factory, subject assumption, operation, resource/course/state and claimed property. Sketch external-shaped input, assumed trusted Actor, selected row, policy, writable-field rule, revision predicate, transaction and returned data. Separate controls supplied by the harness from controls actually implemented by the application.

## 2. Preserve competing hypotheses

Before reading the visible repair or receiving hints, write two claims: a read-disclosure hypothesis and a protected-property-change hypothesis. For each state the causal condition, one bounded forbidden case, its nearest legitimate control, expected response/data/state difference and an alternative explanation. Do not invent a pre-execution timestamp or erase an incorrect prediction after learning the result.

For example, selecting one row with a bound SQL value does not establish its owner relationship. Likewise a correct owner check does not decide which fields that owner may change. Revision checks address a separate write condition. Confirm these distinctions with source anchors, not vulnerability names alone.

## 3. Distinguish prediction from execution

Source inspection supports a source-predicted result. Actual separately approved in-process calls can supply local observations. Missing setup, reviewed transfer/support or private evidence handling stays BLOCKED. Do not reproduce an author's transcript as your run or substitute import failure for the intended assertion outcome. Proposing an experiment does not authorize it.

If execution is separately approved, use only the original lab's reviewed named commands and synthetic fixtures. Preserve source identity, actual test count, failing assertions/errors/skips and support received. Do not use broad discovery as an all-green gate or point a fixture at real data.

## 4. Verify the effect the claim depends on

For reads, compare policy, status, metadata and returned protected content. For updates, compare response and stored fields/revision. A status alone cannot establish that nothing changed. Distinguish a selected rollback injection from a failure after a completed write; a generic error does not by itself identify persisted state. These are investigation questions, not new failure tests performed here.

## 5. Repair, retest and communicate

When editing is separately approved, retain the original source/results, make a narrow local change and keep expected tests intact. Preserve legitimate owner/instructor behavior under the appropriate fixture policy; do not hard-code identities or deny everything. When editing is not approved, label the change a proposal and retesting unattempted.

Use the [existing report layout](code-review-pathway/INVESTIGATION-REPORT-TEMPLATE.md) for scope, causal trace, prediction, actual observation or blocker, repair, positive/negative retests, limitations and stakeholder summary. A layout is not an approved evidence-collection service. Explain the affected fictional operation without claiming live-account exposure or unsupported severity.

## Independence and advanced-content gap

Record hints and visible-reference exposure; unknown assistance history remains unknown. Familiar-fixture performance does not establish unfamiliar-task independence. Before W05 can claim advanced coverage, author original owned scenarios with explicit language/framework support, bounded impact, independent variants, protected criteria, supported execution and calibrated review. This exercise alone supplies none of that validation.

Use no real identities, secrets or submissions. No source execution, test run, database mutation, request or learner assessment occurs in this authoring batch. No completion, access, award or OSWE-readiness decision follows.
