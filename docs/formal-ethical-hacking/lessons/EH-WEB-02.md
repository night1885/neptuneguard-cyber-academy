# EH-WEB-02 — Cookies, sessions and sensitive evidence

Draft; conceptual only and not published. Requires EH-WEB-01. The clean static HTTP fixture has no course login or session implementation. Do not use real accounts, browser profiles or session values for this lesson.

## Outcomes
Distinguish cookie storage from server-side session state, interpret common cookie attributes, and handle session evidence without exposing credentials.

## Connect requests across time
HTTP request semantics are stateless, but applications can associate requests with state using mechanisms such as cookies. A server can send Set-Cookie, and a browser can later send matching cookie name/value pairs in Cookie according to applicable browser rules. Not every cookie authenticates a user: preferences and other state also use cookies.

A session can be represented by an opaque identifier that maps to server-side state; other designs carry protected claims. Do not assume a token is a database identifier or a signed self-contained object merely from its appearance. Authentication state must be validated by the application, not inferred by the learner from an arbitrary string.

## Read attributes precisely
- Secure restricts transmission to secure transport in normal browser operation, with special localhost handling. It does not itself encrypt the cookie value at rest or stop script access.
- HttpOnly prevents access through script-facing cookie APIs such as document.cookie. It does not prevent the browser from attaching the cookie to script-initiated requests and does not eliminate all harm from script execution.
- SameSite controls cookie inclusion in cross-site contexts. Strict, Lax and None have different behavior. Same-site is not identical to same-origin. SameSite=None requires Secure in supporting modern browsers.
- Domain and Path influence matching scope. Path is not a robust confidentiality boundary against other code on the same origin.
- Max-Age and Expires affect browser retention. Session-cookie behavior should not be treated as a guarantee that closing one window invalidates server-side authentication.

Cookie attributes are complementary controls, not proof of complete session security. A particular policy must fit the application and browser behavior; no single setting makes an application immune to CSRF, XSS or authorization errors.

## Paper example — FICTIONAL, never use as a credential
```http
Set-Cookie: demo_session=FICTIONAL_NOT_A_TOKEN; Path=/; Secure; HttpOnly; SameSite=Lax
```
This is a header-reading exercise for a hypothetical HTTPS application, not a configuration for the earlier plain-HTTP peer. Explain each attribute. The presence of these flags alone reveals nothing about entropy, rotation, server-side expiry or authorization checks. No browser behavior or session lifecycle has been executed here.

## Session lifecycle questions
A proper review asks what happens at login, privilege changes, timeout and logout. Rotation can reduce fixation risk; logout and expiry require appropriate server-side behavior rather than merely hiding a page. This lesson asks design questions, not permission to test a live session.

## Evidence discipline
Treat real session identifiers, Authorization headers, reset links and authentication cookies as sensitive. Do not paste them into tickets, public repositories or course chat. Use fabricated values for conceptual answers and approved redacted excerpts for future authorized practical work. If exposure occurs, follow the actual incident process; deleting a screenshot alone does not invalidate an exposed credential.

## Guided offline case work
Use the [cookie/session case pack](COOKIE-SESSION-CASEPACK.md), [blank worksheet](COOKIE-SESSION-WORKSHEET.md) and linked fictional JSON to distinguish declared flags, browser behavior and expressly supplied server facts. The optional local reader extracts attributes without printing cookie values; it does not install a cookie, contact an origin, emulate a browser or validate a real session. This support work adds no request budget, real account test, replay permission, prerequisite or compulsory deliverable.

## Independent work
Explain the limits of Secure, HttpOnly and SameSite separately. Explain why a cookie is not automatically a login session. Describe what evidence would be needed to assess logout invalidation without proposing use of another person's credentials. Keep all answers fictional; no practical session replay or real account testing is authorized.

Source: MDN, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies and https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie . Browser-specific validation and assessor calibration remain release work. The supporting case pack records only local fictional-data parsing checks, not browser/server lifecycle execution.

## Expanded teaching: separate cookie policy from session authority

This supplement is entirely conceptual. It authorizes no login/logout execution, browser-profile inspection, cookie installation, interception or token replay. Use only fictional values and the existing offline case pack. The plain-HTTP fixture still has no session implementation.

### Follow the value without inventing its meaning

A response's Set-Cookie declaration asks a user agent to store a cookie under applicable rules. A later Cookie request header can carry matching name/value pairs. Storage, inclusion and server acceptance are separate decisions. A declaration alone does not establish that a particular browser accepted or sent the value.

Cookie attributes are not normally echoed back as a complete Set-Cookie policy inside Cookie. Therefore a request excerpt containing a name/value pair does not independently reveal all attributes that governed its storage and transmission. Preserve the distinction between a declaration record and a request record.

A cookie might hold a preference, an anonymous correlation identifier or authentication-related state. Its name and visual appearance do not prove which design applies. Even a long opaque-looking value is not a measurement of randomness, signing or encryption. Ask what the application actually validates rather than treating presentation as authority.

### Use a three-layer evidence model

| Evidence layer | Question | What it cannot establish alone |
|---|---|---|
| Declared attributes | What policy does the supplied header request? | Actual acceptance or transmission by a supported browser |
| Browser behavior | What was stored or included in a specified context? | Server expiry, rotation or resource authorization |
| Server behavior | Which supplied or authorized observations describe session acceptance and access? | Every browser context or all possible lifecycle paths |

The existing case pack supplies declarations and some explicit fictional server facts, not a browser emulator. An empty server-facts section means the facts are missing, not that the implementation passed a review. Do not fill that gap with invented output.

### Explain controls as complementary restrictions

Secure restricts cookie transmission to secure transport under applicable browser behavior, including special localhost treatment. It does not encrypt stored cookie data or establish the session's entropy. HttpOnly restricts script-facing access to the cookie value; it does not prevent the browser from including that cookie on matching script-initiated requests or make all script execution harmless.

SameSite concerns cross-site inclusion, not every cross-origin distinction. An origin is defined by scheme, host and port. Schemeful site comparisons use a different boundary involving the scheme and registrable domain. Two subdomains can therefore be different origins while sharing a site. Treat this as a paper concept, not an instruction to navigate between real applications.

Omitted SameSite is not a reliable synonym for an explicit policy across browsers and versions. Defaults and exceptions need supported-browser evidence. The lesson's named attributes are design inputs, not a universal pass checklist or an instruction to change a live service.

Domain and Path influence matching. Omitting Domain makes a cookie host-only in the ordinary model rather than explicitly extending it to matching subdomains. Path is not the server's authorization rule or a robust confidentiality boundary between applications on one origin. Do not infer that someone who changes a path has acquired permission to retrieve another learner's data.

### Work lifecycle questions on paper

An opaque cookie can identify a server-side session record, but removing the client's stored cookie does not inherently invalidate that record or a previously exposed copy of its credential. The actual logout design must ensure the appropriate session ceases to be accepted on the server side. Browser retention and server authentication lifetime are different questions.

Rotation at authentication or privilege changes addresses a different risk than Secure or HttpOnly. A stable cookie name can carry a changed identifier, while two redacted strings with the same visible placeholder do not prove identifier equality. Use only explicit fictional equality facts in this lesson's cases; do not expose real secrets to demonstrate the distinction.

Idle expiry concerns inactivity; absolute expiry limits lifetime regardless of ongoing activity. Their implementation and policy require server-side evidence. Closing a tab, hiding a logged-in page or observing an expired cookie does not by itself establish that a session credential is no longer accepted.

### Compare two claims — FICTIONAL

Claim A: “The header declares Secure, HttpOnly and SameSite=Lax, so logout invalidation works.” The conclusion jumps from declaration policy to unobserved server lifecycle behavior. Narrow it to the declared attributes and list server invalidation as unestablished.

Claim B: “The supplied case explicitly states that the server still accepts the old identifier after logout under a policy requiring invalidation.” Here the concern follows from a supplied fictional server fact, not from guessing at a header. Explain the policy mismatch without claiming that a real account was accessed or replaying any credential.

This distinction is central to the existing case pack: attribute parsing and lifecycle validation are different tasks. Its optional reader does the former for fictional input and must not be described as doing the latter.

### Treat evidence as sensitive even when labels look ordinary

Real session identifiers can function as credentials. Avoid copying cookie values, Authorization headers, reset links and raw browser exports into tickets, course chat, repositories or AI prompts. Renaming a secret field does not make its contents safe.

A redacted presentation copy should retain enough non-sensitive context to support the permitted claim without creating false equality between unrelated values. If a credential is exposed, deleting the visible screenshot does not revoke it. Follow the actual incident and session-revocation process; this reading exercise invents no operational contact or authority.

### Human-led AI critique — FICTIONAL only

First manually critique Claim A. If an approved assistant is available, provide only that fictional sentence and the three-layer table. Ask it to identify the observed layer, unsupported conclusion and evidence category needed next, without inventing a browser test or suggesting replay. Reject any response that asks for real tokens or treats all declared flags as proof of complete session security. Manual critique satisfies the same objective.

### Formative questions with explanations

1. Is every cookie an authentication session? No. Cookies support other state, and server-side validation determines the meaning of authentication-related values.
2. Does HttpOnly prevent every authenticated script-initiated action? No. It limits value access through script-facing cookie APIs, not all matching requests.
3. Do matching REDACTED placeholders establish equal tokens? No. The equality must be an explicit fictional fact here, not inferred from redaction.
4. Does cookie deletion establish server invalidation? No. Those are separate lifecycle events requiring separate evidence.
5. Can an AI review of fictional headers validate a real session? No. It can critique reasoning about the supplied data, not observe an implementation it has not tested.

Technical reading: MDN Set-Cookie and OWASP Session Management Cheat Sheet. Supported-browser behavior and server lifecycle execution remain unvalidated by this conceptual supplement.
