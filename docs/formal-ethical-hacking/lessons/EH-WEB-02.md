# EH-WEB-02 — Cookies, sessions and sensitive evidence

Draft; conceptual only and not published. Requires EH-WEB-01. The clean static HTTP fixture has no course login or session implementation. Do not use real accounts, browser profiles or session values for this lesson. Community Learning is unchanged.

## Outcomes
Distinguish cookie storage from server-side session state, interpret common cookie attributes, and handle session evidence without exposing credentials.

## Your task and finish line
Explain the request-to-session model, annotate the existing fictional header and complete the existing independent explanations. Keep three evidence levels separate: declared header attributes, browser behaviour actually supplied as evidence, and application/server-side session facts. Finish by stating what the supplied material establishes and what remains unknown.

No login, browser inspection, cookie installation, HTTP request, token decoding, replay, logout test or configuration change is required or authorized. The earlier GET/HEAD allowance does not become a session-testing allowance. Conceptual accuracy is not practical session-assessment competence.

## 1. Connect requests across time without confusing the components
HTTP request semantics are stateless, but applications can associate requests with state using mechanisms such as cookies. A server can send Set-Cookie, and a browser can later send matching cookie name/value pairs in Cookie according to applicable browser rules. Not every cookie authenticates a user: preferences and other state also use cookies.

A session can be represented by an opaque identifier that maps to server-side state; other designs carry protected claims. Do not assume a token is a database identifier or a signed self-contained object merely from its appearance. Authentication state must be validated by the application, not inferred by the learner from an arbitrary string.

| Component or decision | Its role | What it does not prove |
|---|---|---|
| Set-Cookie response header | Communicate a cookie name/value and declared attributes to the user agent | That this browser accepted, stored or later sent it |
| Browser cookie storage and matching rules | Determine eligible storage and transmission in that environment | That a server-side session exists or remains valid |
| Cookie request header | Carry selected cookie name/value pairs with a request | That the request itself reveals every original Set-Cookie attribute |
| Application session validation | Decide whether supplied session material is valid under the application's policy | That every requested resource/action is authorized |
| Authorization decision | Decide whether the subject may perform the particular action in context | That a cookie or successful login grants all permissions |

The last distinction is developed in EH-WEB-03. Do not turn this introduction into a live access-control test or a claim that the static fixture has an authentication system.

### A model to explain, not an observed exchange
```text
Server supplies Set-Cookie
  -> browser applies its storage/policy rules
     -> an eligible later request may carry Cookie name/value pairs
        -> application validates session material and its current state
           -> application makes the action/resource authorization decision
```

Each arrow has assumptions. A copied header does not establish that the browser accepted the cookie; a stored cookie does not establish it was attached to a particular request; a transmitted identifier does not establish a valid session or authorized operation. Do not invent missing browser or server observations.

## 2. Read the existing fictional header in context
### Paper example — FICTIONAL, never use as a credential
```http
Set-Cookie: demo_session=FICTIONAL_NOT_A_TOKEN; Path=/; Secure; HttpOnly; SameSite=Lax
```

This remains the existing header-reading exercise for a hypothetical HTTPS application, not a configuration for the earlier plain-HTTP peer. Do not install it in a browser, send it to an endpoint or substitute a real cookie value. The name suggests a session purpose in this fictional example; the name alone would not establish that purpose in an actual application.

| Visible part | What to identify | Required limit |
|---|---|---|
| demo_session | The example cookie name | A name is not proof of authentication or server-side implementation |
| FICTIONAL_NOT_A_TOKEN | The fabricated value | It is not a real credential and demonstrates no entropy, signing or validity property |
| Path=/ | A declared matching path | It is not a confidentiality boundary or a server-side permission check |
| Secure | A declared secure-transport restriction | It does not itself encrypt stored values or prevent script-facing access |
| HttpOnly | A restriction on script-facing cookie APIs | It does not prevent eligible script-initiated requests from carrying the cookie |
| SameSite=Lax | A declared cross-site inclusion policy | It does not establish universal browser behaviour or complete CSRF protection |

Domain, Max-Age and Expires are absent from this supplied header. Do not add invented values when annotating it. In the normal browser model, omitting Domain gives host-only scope, while no Max-Age/Expires expresses a session cookie. The exact setting host and browser-session lifecycle are not supplied here. Do not conclude that closing one window proves logout or destroys server-side authentication.

A later request's Cookie header would carry eligible name/value pairs, not simply echo the entire Set-Cookie declaration and all its attributes. Therefore, an attribute absent from a request's Cookie text is not evidence that the server never declared it. This is a reading distinction, not an instruction to produce a request.

## 3. Interpret the existing attributes precisely
### Secure
Secure restricts transmission to secure transport in normal browser operation, with special localhost handling and browser-specific details. It does not itself encrypt the cookie value at rest, make the value unreadable to every local actor or stop script access through cookie APIs. Do not generalize a localhost exception to the earlier literal-IP plain-HTTP guest fixture.

Transport protection, cookie handling and server-side authorization are separate controls. A Secure declaration is not proof that a particular connection used valid TLS, that a certificate was verified or that every endpoint was protected. No HTTPS route is configured or tested by this lesson.

### HttpOnly
HttpOnly prevents access through script-facing cookie APIs such as document.cookie. It does not prevent the browser from attaching the cookie to eligible script-initiated requests, and it does not eliminate all harm from script execution.

Do not equate inability to read a cookie through one API with an inability to act through the authenticated application. Nor should a value visible to an authorized device owner in developer tooling be treated as proof that HttpOnly failed. This lesson does not authorize inspecting a real browser profile to demonstrate either point.

### SameSite
SameSite controls cookie inclusion in cross-site contexts. Same-site is not identical to same-origin; use the actual browser/site/request context rather than treating the terms as interchangeable.

| Declared value | Basic distinction | Limit |
|---|---|---|
| Strict | Restrict inclusion to same-site requests | It is not automatically appropriate for every application flow or an authorization control |
| Lax | Allow same-site use and certain cross-site top-level navigations using safe methods | Not every cross-site request qualifies; browser defaults and details require validation |
| None | Permit cross-site eligibility as well as same-site use | Supporting modern browsers require Secure; other browser/credentials/privacy rules can still prevent inclusion |

Do not infer a universal default from an omitted attribute or assume identical behaviour in every browser/version. SameSite=None is not permission for arbitrary origins to read sensitive data. No single SameSite setting makes an application immune to CSRF, XSS or authorization errors. A policy must fit the application's legitimate flows and actual supported browsers.

### Domain and Path
Domain and Path influence matching scope. Under the normal model, omitting Domain restricts the cookie to the setting host rather than including its subdomains. A valid explicit Domain can broaden matching to that domain and its subdomains, subject to the browser's domain rules; it does not allow a server to set cookies for any unrelated domain.

Path affects which request paths match for transmission. It is not a robust confidentiality boundary against other code on the same origin. Neither attribute replaces application permission checks or establishes that a sibling service can be trusted. Do not change hosts, paths or browser configuration to test these concepts here.

### Max-Age and Expires
Max-Age and Expires affect browser retention. Max-Age expresses a lifetime in seconds; Expires supplies a date/time. When both are set, Max-Age takes precedence under the documented model. These attributes do not themselves establish the server's authentication timeout or revocation policy.

For a session cookie, the browser defines the relevant session lifecycle and may restore session state across restarts. Closing one window, removing a cookie from storage, or seeing a logged-out page is not by itself evidence that a server will reject previously issued session material. Do not replay that material to prove the point in this conceptual lesson.

Cookie attributes are complementary controls, not a complete session-security result. The example contains no evidence about identifier generation, rotation, server-side expiry, invalidation or enforcement on individual actions.

## 4. Ask the existing lifecycle questions at the right evidence level
A proper review asks what happens at login, privilege changes, timeout and logout. Rotation can reduce fixation risk; logout and expiry require appropriate server-side behaviour rather than merely hiding a page. These are design questions, not permission to test a live session.

| Lifecycle point | Question for a future authorized review | What the fictional header cannot answer |
|---|---|---|
| Login | How is authenticated session state established and any prior identifier handled? | Whether generation, rotation and validation are implemented correctly |
| Privilege change | How do current permissions and session state reflect a changed authority level? | Whether the application checks the new context on each relevant operation |
| Timeout | Which browser and server-side lifetimes apply, and how is expiry enforced? | Whether a retention attribute equals actual authentication expiry |
| Logout | What server-side behaviour makes the ended session unusable under the design? | Whether hiding a page or clearing a client cookie actually invalidated session material |

A future logout assessment would need a reviewed implementation, explicitly authorized test identities/actions, clear lifecycle expectations and genuine observations of the relevant server-side result. It must not rely on another person's credentials or the mere presence/absence of a cookie. This describes missing evidence and authority; no test sequence or replay permission is added.

## 5. Know what different evidence tools would show — reading only
| Evidence source/tool role | Useful distinction | Limit here |
|---|---|---|
| Provided response header | Attributes explicitly declared in the supplied material | Not observed browser acceptance or server behaviour |
| Browser Network view | What a particular request/response observation exposes | Can contain sensitive material and does not alone prove lifecycle enforcement; no real browser inspection is authorized |
| Browser Storage/Application view | What that browser stores and reports about matching/retention attributes | Stored state is not a server-side validity decision; no cookie installation or profile access is authorized |
| Application-side observations | Facts about validation, expiry or invalidation under an authorized design | None are supplied by the static peer or this fictional header |
| Existing optional offline reader | Extract attributes from supplied fictional local records without printing cookie values | Not a browser emulator, request sender or real session validator |

Do not install a proxy, export a browser cookie jar, paste values into developer consoles or alter client settings to fill these gaps. An HTTP-client display and a browser policy decision are not automatically interchangeable evidence. Tool purpose must be separated from tool availability, permission and demonstrated competence.

## 6. Handle sensitive evidence without creating a new exposure
Treat real session identifiers, Authorization headers, reset links and authentication cookies as sensitive. Do not paste them into tickets, public repositories or course chat. A screenshot can expose usable material even when the intended question was only about attributes.

Use fabricated values for this lesson's conceptual answers. For future authorized work, use only approved minimal redacted excerpts that preserve the relevant non-sensitive context and meaning. Do not label a real token fictional, reproduce a secret to explain its redaction or upload evidence to an unapproved converter or public analysis service.

Separate what was declared, what was observed and what is still unknown. Do not claim an attribute was enforced merely because a local parser recognized its text. If the evidence is insufficient, narrow the conclusion rather than acquire additional real account data.

If exposure occurs, follow the actual incident process. Deleting a screenshot alone does not invalidate an exposed credential. This lesson sets no incident contact, retention duration, deletion guarantee or real credential-remediation procedure; those must come from approved policy. If the required route is missing, remain stopped rather than improvise testing or public disclosure.

## Guided offline case work
Use the [cookie/session case pack](COOKIE-SESSION-CASEPACK.md), [blank worksheet](COOKIE-SESSION-WORKSHEET.md) and linked fictional JSON to distinguish declared flags, browser behavior and expressly supplied server facts. The optional local reader extracts attributes without printing cookie values; it does not install a cookie, contact an origin, emulate a browser or validate a real session. This support work adds no request budget, real account test, replay permission, prerequisite or compulsory deliverable.

## 7. Existing independent work
Explain the limits of Secure, HttpOnly and SameSite separately. Explain why a cookie is not automatically a login session. Describe what evidence would be needed to assess logout invalidation without proposing use of another person's credentials. Keep all answers fictional; no practical session replay or real account testing is authorized.

Use the existing fictional header and provided facts, identify each unsupported conclusion and explain the missing evidence. Do not invent a browser trace, server log, entropy measurement, rotation event or successful logout test. No additional case pack, browser exercise or compulsory submission artifact is added.

## 8. Feedback and release boundary
A reviewer should look for the distinction between cookie storage and session validity, accurate attribute interpretation, browser-versus-server evidence limits, and protection of sensitive material. Feedback should identify the exact unsupported inference or confused control and request a focused explanation, not access to a real account or a replay demonstration. Record assistance separately from independent reasoning.

Formal thresholds, assessor calibration and browser-specific validation remain pending. Use the actual approved private submission route only when access, format, collection and retention rules exist. This Markdown document is not private storage or a collection system. Reading, a parsed header or a submitted answer does not automatically grant progression, lab permission, grades or awards.

Sources: MDN, https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies and https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie . Consulted 2026-11-02. These sources document browser behaviour and compatibility considerations; they do not validate the academy's guest/browser routes, application or evidence policy.

This expansion changes only the existing EH-WEB-02. It preserves EH-WEB-01 as its prerequisite, conceptual-only scope, original fictional header, independent questions and optional support links. It adds no real account, session replay, target, request allowance, canonical lesson ID, prerequisite edge, reading-profile entry, runtime integration, publication flag, Discord handler, database change or deployment.

No cookie installation, browser/profile inspection, HTTP request, credential/token processing, server-session lifecycle, supported-platform reproduction, full repository suite, independent learner assessment or assessor calibration was executed for this authoring batch. The supporting case pack's earlier checks retain their original scope: local fictional-data parsing checks, not browser/server lifecycle execution.
