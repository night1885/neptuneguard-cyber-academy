# W01 — HTTP evidence, sessions and permission decisions

Draft learner material. W01 is a planning label, not a registered lesson ID. This package does not complete W00, activate progression or authorize requests. Use fictional data only; no browser profile, real account, token, login, replay or target inspection is needed.

## Entry and outcomes

Learn the relevant foundation concepts through this course or reviewed equivalent skills; no CPTS, OSCP or GPEN enrollment/completion is required. Review the [foundation package](STANDALONE-WEB-FOUNDATIONS.md) and HTTP/transport worksheet. Formal prerequisite acceptance remains a separate review.

After teaching and independent review, the intended learner can distinguish response metadata from transferred content; cookie declarations from browser/server behavior; authentication from per-resource authorization; and a supported finding from an untested hypothesis. This draft does not establish those outcomes merely by being read.

## 1. Read the exchange before judging it

A request has a method and target; a response provides status, metadata and content where permitted. HEAD has GET-like semantics but no response content. A representation-length header in HEAD does not prove those bytes were transferred. Status 200 alone is not evidence that access was authorized or that sensitive content was returned. Conversely, a denial status does not erase sensitive content actually included in a response.

Worked fictional pair: GET / returns 200 with the text 'training page'; HEAD / returns 200, a representation-length header and no content. The pair supports a limited protocol explanation, not secure authorization, encrypted transport or a successful login. No request was executed to create this case. An unexpected redirect requires a scope decision before following it.

The shared [HTTP lesson](../lessons/EH-WEB-01.md) retains its own setup, exact target, GET/HEAD budget, proxy/time limits and stop rules. This paper package transfers none of that permission or budget. No fixture is changed.

## 2. Separate three session evidence layers

A Set-Cookie header requests cookie behavior. Browser acceptance/storage/transmission is a separate observation. Server-side identity, expiry, rotation and permission enforcement are another layer. Do not infer all three from a header.

Fictional declaration for a hypothetical HTTPS application:

```http
Set-Cookie: demo_session=FICTIONAL_NOT_A_TOKEN; Path=/; Secure; HttpOnly; SameSite=Lax
```

Secure concerns secure transmission in normal browser operation, not encryption at rest. HttpOnly restricts script-facing cookie APIs, not all script-initiated requests or all script harm. SameSite concerns cross-site inclusion; it is not identical to same-origin and is not complete CSRF protection. Path matching is not a resource-authorization rule. Flags alone establish neither token quality nor logout invalidation.

Worked fictional lifecycle: a server fact explicitly states that the old session remains accepted after logout under a policy requiring invalidation. That supplied fact supports a lifecycle concern; the cookie-removal header alone would not establish it. Two redacted labels both reading REDACTED would not by themselves prove token equality. Do not collect raw secrets to resolve a fictional question.

Read [cookies and sessions](../lessons/EH-WEB-02.md) and the [fictional case pack](../lessons/COOKIE-SESSION-CASEPACK.md). The existing clean HTTP peer has no login/session implementation. These examples are not observed headers from it and do not provision HTTPS or session handling.

## 3. Model the permission decision

Authentication verifies an identity claim. Authorization decides whether a subject may perform an action on a resource in context. An authenticated learner can correctly be denied access to another learner's submission. Hidden buttons and opaque identifiers are not substitutes for server-side checks.

Fictional exercise policy: an enrolled learner may read/edit their own draft in their assigned course; may not read another learner's submission or assign grades; and may not edit a submitted record. An instructor may review only within their assigned course. A visitor may read public descriptions. Missing trusted permission context is not an implied allow. This is not the academy's implemented policy.

Worked case: learner A requests learner B's submission. The supplied response is status 200 with denial text only and no protected content. The policy requires denial, but this evidence alone does not demonstrate disclosure of B's submission. Assess response content and server effect, not the status alone. It also does not prove every operation is protected.

Use the [authorization lesson](../lessons/EH-WEB-03.md) for the fuller model. No real identifier enumeration, role spoofing, account testing or backend operation is authorized here.

## Next activity and limits

Complete the [learner cases](STANDALONE-WEB-W01-CASES.md) without consulting staff answers first. Keep known facts, inference, unknowns and next permitted clarification separate. Use only approved private evidence handling if submitting; otherwise retain fictional answers locally without uploading.

Practical W01 still needs reviewed setup, owned fixtures, supported-platform reproduction, approved operations, independent assessment and release gates. This package adds no executable reader, live request, browser test, course completion or OSWE-alignment claim.
