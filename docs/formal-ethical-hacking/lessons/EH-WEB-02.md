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

## Independent work
Explain the limits of Secure, HttpOnly and SameSite separately. Explain why a cookie is not automatically a login session. Describe what evidence would be needed to assess logout invalidation without proposing use of another person's credentials. Keep all answers fictional; no practical session replay or real account testing is authorized.

Source: MDN, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies and https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie . Browser-specific validation and assessor calibration remain release work.
