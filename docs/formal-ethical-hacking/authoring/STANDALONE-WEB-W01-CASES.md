# W01 — independent fictional evidence cases

Draft learner worksheet after [W01 teaching](STANDALONE-WEB-W01-TEACHING.md). All facts below are invented, not execution results. No endpoint, browser, token, account or real record is supplied or needed. Do not turn these cases into live tests.

## Answer format

For each case record: subject/action/resource/context where applicable; governing policy; expressly supplied evidence; supported conclusion; unsupported conclusion; missing evidence; and next permitted action. State whether a fact is supplied or inferred. Record substantive hints separately from access support. No numeric pass threshold is established.

## Case A — denied content with success status

Learner A may read only their own draft in course Blue. They request B's draft. The invented response is 200 with 'access denied' and no protected content. No server logs or other operations are supplied. Separate the required permission decision from whether this record proves disclosure.

## Case B — error status with protected content

Same policy and identities as A. The invented response is 403 but includes B's draft text, explicitly identified as protected content in this scenario. Explain how the content changes the conclusion and what remains unknown about cause, other resources and reproducibility. Do not claim a real vulnerability was observed.

## Case C — good flags, unknown lifecycle

A fictional header has Secure, HttpOnly and SameSite=Lax. No browser behavior, server expiry, rotation or logout facts are supplied. Identify the requested controls and three unanswered lifecycle questions. Do not infer token quality or successful logout.

## Case D — deletion versus invalidation

The scenario expressly states that a matching cookie-deletion header was processed, but the fictional server still accepts the old session after logout. Its stated policy requires invalidating that session. Explain the supported lifecycle concern and why deleting a screenshot or closing a window is not the missing server control. No replay is authorized.

## Case E — instructor in the wrong course

A trusted instructor identity is assigned only to course Blue and requests a private submission from course Green. Use the teaching policy. Distinguish authentication, role and resource/course assignment. Would a hidden Green-course button supply the missing enforcement?

## Case F — missing ownership evidence

A trusted learner requests a draft; the supplied record omits its owner and course. No effective server permission decision or response content is supplied. State what cannot be concluded and the deny-by-default design implication without claiming an actual disclosure or actual runtime decision.

## Case G — redirect and protocol metadata

An approved fictional brief would allow only one GET / and one HEAD / against its exact peer; it forbids redirect following. A supplied GET response redirects elsewhere. A separate supplied HEAD record advertises a representation length but no body. Explain the scope stop and the difference between metadata and transferred content. These supplied records grant no real request budget.

## Finish

Write one short finding for a supported scenario concern and one clarification note for an underdetermined case. Include expected policy, supplied result, evidence limits and a proposed remediation/retest goal, not an unapproved execution plan. Use no real IDs or credentials. This is paper performance only, not independent practical competence, permission or W01 completion.
