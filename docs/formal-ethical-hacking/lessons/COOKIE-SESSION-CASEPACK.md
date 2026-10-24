# Cookie declarations and session lifecycle — fictional cases

Draft support for [EH-WEB-02](EH-WEB-02.md), not a new canonical lesson or live-account exercise. Use only the supplied [cases.json](../fixtures/cookie-sessions/cases.json). All cookie values, host labels and session references are invented. No request, login, logout, browser-profile access, cookie installation, session replay or interception is authorized or needed.

## 1. Separate three evidence layers
A Set-Cookie declaration describes requested cookie behavior. A particular browser's accepted/stored/sent behavior is a separate observation. Server authentication, expiry, rotation and authorization are another layer. Header flags do not establish all three.

The fixture contains fictional HTTPS origin labels and selected cookie headers, plus expressly stated server_facts for E/F. An empty server_facts object means no such facts are supplied, not that the server is secure or insecure. The earlier plain-HTTP clean peer has no session implementation; these are not its observed headers or instructions to add a login.

No browser/version, complete request sequence, capture time, full cookie jar, server log or deployed configuration is supplied. Do not invent them. The fictional values cannot demonstrate real token entropy, signing, encryption, unpredictability or ownership.

## 2. Case A — useful flags, incomplete assurance
A declares Path=/, Secure, HttpOnly and SameSite=Lax, with no Domain attribute. In the ordinary supporting-browser model, Secure limits transmission to secure transport, HttpOnly limits script-facing cookie access, and SameSite controls cross-site inclusion. Omitting Domain makes the declaration host-scoped rather than explicitly sharing it across a parent domain's subdomains. Browser-specific rules still need validation.

These controls do not independently prove strong token generation, correct server expiry, rotation, private storage, CSRF protection or per-object authorization. HttpOnly does not prevent a browser from attaching the cookie to script-initiated requests, and it does not eliminate all effects of script execution. Secure is not encryption of a stored cookie value. SameSite is defense in depth, not a replacement for the applicable CSRF defenses.

Questions: Which properties are requested? What remains unknown? Which application behavior would you need before declaring the session lifecycle sound?

## 3. Case B — absent declarations are not observed exploitation
B declares HttpOnly and Path=/ but no explicit Secure or SameSite. Identify those omissions without claiming that an actual token crossed plaintext HTTP or that a cross-site action succeeded. The origin label alone is not a transport capture.

Do not silently treat missing SameSite as None or claim every browser uses identical defaults. Explicit policy, supported browser behavior, transport configuration and the actual workflow matter. No live test is part of this task.

## 4. Case C — Domain broadens matching scope
C explicitly supplies Domain=example.invalid from the fictional portal.example.invalid origin. That declaration covers the specified parent domain and matching subdomains under the applicable cookie rules; it is not limited to the original portal host. It does not grant unrelated domains access.

Ask whether subdomain sharing is a genuine requirement, who controls sibling applications and what isolation assumptions are being made. A broad scope deserves review; this header alone does not demonstrate a subdomain compromise or justify a severity score. HttpOnly does not turn a broad Domain into host-only scope.

## 5. Case D — Path is not a permission boundary
D supplies Path=/course-a. Path influences where a browser includes a cookie; it is not the server's course-assignment rule or a robust confidentiality boundary between applications sharing an origin.

This header also has HttpOnly. Do not therefore claim that JavaScript on another path necessarily reads its value through document.cookie. The distinct point is that path matching does not establish identity, course permissions or protection against all requests originating from other code. Authorized resource checks remain server-side responsibilities.

Questions: What would prevent course A's learner from retrieving course B's record? Which cookie controls would not answer that question?

## 6. Case E — cookie deletion is not server invalidation
E requests removal using an empty value and Max-Age=0. Deletion needs the appropriate cookie scope; a header in isolation does not prove that every relevant stored cookie was removed. More importantly, this case expressly states that the fictional server still accepts its previous session identifier after logout. That is a supplied scenario fact, not a result derived by the reader.

Under a logout policy requiring that session's invalidation, clearing the client cookie is insufficient. Server-side invalidation and applicable expiry behavior must be assessed independently. This does not authorize obtaining or replaying an actual session identifier. Deleting a screenshot or closing a window is not a substitute for the real incident/session-revocation process if a credential is exposed.

## 7. Case F — rotate identifiers, not just labels
F expressly states that its pre-auth and post-auth references denote the same fictional server session identifier. OWASP recommends renewing the identifier at authentication/privilege changes to mitigate fixation risk. Identify the missing lifecycle protection in the stated scenario without claiming that a real attacker fixed a session or accessed an account.

In a real review, an unchanged cookie name does not imply an unchanged value. Likewise two independently redacted strings that both read REDACTED do not establish token equality. This fixture makes equality an explicit supplied fact so the reasoning exercise is well-defined. Establish correlation through an approved privacy-preserving method; do not publicly record raw secrets to prove it.

## 8. Optional local attribute reader
Read the JSON as text first. If Python is available through the approved setup/material route, save this as read_cookie_cases.py beside cases.json:

```python
from pathlib import Path
from http.cookies import SimpleCookie
import json

raw = Path("cases.json").read_bytes()
if len(raw) > 16384:
    raise ValueError("Use only the tiny reviewed teaching fixture")
data = json.loads(raw)
if data.get("synthetic") is not True:
    raise ValueError("Expected fictional teaching data")
for case in data["cases"]:
    cookie = SimpleCookie()
    cookie.load(case["set_cookie"])
    if list(cookie) != ["demo_session"]:
        raise ValueError("Unexpected teaching cookie structure")
    item = cookie["demo_session"]
    print(case["id"], bool(item["secure"]), bool(item["httponly"]),
          item["samesite"] or "not-supplied", item["domain"] or "no-domain-attribute",
          item["path"] or "not-supplied")
```

Run `python3 -B read_cookie_cases.py` in the disposable fixture directory. It prints six columns describing parsed declarations, not cookie values, browser acceptance or session validity. Inspect Max-Age and the supplied server_facts directly in the reviewed JSON. SimpleCookie is not a browser emulator or a hardened general header-ingestion system; the size/tag checks are exercise guards, not a general resource-defense design. Do not substitute real cookie jars, headers, credentials or untrusted reports.

If tools or transfer guidance are missing, use text inspection and record the blocker. Do not install packages or reconnect an isolated guest for this supporting exercise.

## Deliverables and bounded author checks
Complete the [worksheet](COOKIE-SESSION-WORKSHEET.md). For each case distinguish a declared attribute, a supplied fictional server fact, a policy concern and an observation that would still need an authorized implementation test. Keep real session identifiers, reset links and Authorization headers out of tickets, course chat and repositories.

The 1876-byte UTF-8 fixture had SHA-256 e4355b6a093c43764661d49ce376e286146181ad1f4a5d972118237250b9eae9 during authoring. Local checks parsed six fictional headers, verified the intended flags/scope fields, E's Max-Age=0 and explicit invalidation fact, and F's expressly equal references. The reader executed on Python 3.12.8 with status zero and printed six rows without cookie values. These checks did not validate browser behavior or exercise a server lifecycle.

No real account, HTTP request, browser cookie, session replay, server-side session operation, student-hardware route, grading calibration, full repository suite or GitHub CI run was used. This support pack changes no canonical count, request budget, prerequisite, runtime/publication setting, Community Learning behavior or real learner state.

Sources:
https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies
