# Authorization evidence — fictional offline cases

Draft support for [EH-WEB-03](EH-WEB-03.md), not a live-target exercise or a new permission grant. The linked [cases.json](../fixtures/authorization-evidence/cases.json) contains only fictional records. Do not send requests, alter identities, access real submissions or import browser/session material.

## Three separate questions
1. Policy: for this subject, action, resource and context, is access allowed?
2. Protocol: what status was reported, if one is supplied?
3. Disclosure: what protected content, if any, is actually in the supplied body?

A response status is not the authorization policy itself. A 200 may accompany allowed content, leaked protected data or a generic denial message. A 403 that includes a protected object would still disclose it. Interpret the status and body together, against the stated policy and reliable context. OWASP recommends server-side checks, deny by default and permission validation on every request. Neither a friendly UI nor a single passing response establishes full enforcement.

## Evidence caveat
All subjects, courses, resources and bodies below are made up. The dataset labels `trusted_context` are scenario assumptions for the paper exercise, not information authenticated by this file. The responses are structured examples, not raw HTTP, packet captures or results from the academy fixture. No system was queried.

## Case A — permitted owner read
Fictional student `student-a` reads their own draft in `demo-course`; response is 200 with fictional draft content. This agrees with the earlier exercise policy. It does not prove identity was authenticated in an actual system, that every route checks permissions, or that production data was read.

## Cases B and C — same forbidden content, different status
The context says `student-a` reads `student-b`'s draft. The fictional policy forbids this. Both B and C supply the same `FICTIONAL classmate draft` content, while B reports 200 and C reports 403. Under the supplied assumptions, both responses disclose prohibited content; C's status does not cure the body disclosure. This is deliberately a paper comparison, not an exploitation recipe or observed defect.

If a real assessment yields a status/body disagreement, stop at the approved scope and evidence procedure. Do not retrieve additional records to see whether the issue repeats. Preserve only the minimal authorized, redacted evidence and report the mismatch for review.

## Case D — 200 with denial text only
D reports HTTP 200 but supplies only `Access denied`, not the classmate draft. A status code by itself does not demonstrate that protected data crossed the boundary. The body is consistent with a denial message in this limited fictional record. It still proves nothing about other operations or hidden data not supplied in the case.

## Case E — client role claim is not authority
The trusted scenario says the subject is a student; an untrusted request field claims `instructor`. No response is supplied, so do not infer allow or deny from an actual server. The design principle is that a client-supplied role claim cannot replace authenticated, authoritative server context. This record demonstrates the input distinction, not whether any application accepted the claim.

## Case F — ownership is unknown
F's owner is null/unknown. The supplied record contains no submission content, but provides too little context to decide whether this subject may read the resource. A deny-by-default design should not turn missing ownership information into an implied allow. At the same time, this synthetic 200 with a generic message is not evidence of an actual access-control failure. Identify what trusted ownership/course facts and policy decision would be needed.

## Optional offline reader
Read the supplied JSON first. If Python is available through the approved setup route, save this optional reader as read_authorization_cases.py beside cases.json:

```python
from pathlib import Path
import json

raw = Path("cases.json").read_bytes()
if len(raw) > 16384:
    raise ValueError("Use only the tiny reviewed teaching fixture")
data = json.loads(raw)
if data.get("synthetic") is not True:
    raise ValueError("Expected fictional teaching data")
for case in data["cases"]:
    context = case["trusted_context"]
    response = case["response"]
    status = "not-supplied" if response is None else str(response["status"])
    keys = "not-supplied" if response is None else ",".join(sorted(response["body"]))
    owner = context["resource"]["owner_id"] or "unknown"
    print(case["id"], context["subject"]["role"], owner, status, keys)
```

Run `python3 -B read_authorization_cases.py` in a disposable directory. It reports case, assumed subject role, owner label, supplied status and body field names. It deliberately does not print body values. It reads local synthetic JSON only; it does not authenticate, issue requests or run the existing policy code. This fixed exercise reader is not a general importer for untrusted captures. If setup is unavailable, use text inspection and note the blocker—do not install packages or reconnect an isolated guest.

## Worksheet and author checks
Complete [the worksheet](AUTHORIZATION-EVIDENCE-WORKSHEET.md). Keep policy, supplied context, status, body evidence and uncertainty in separate columns. Do not include real names, IDs, session values or submissions.

The 3572-byte UTF-8 fixture had SHA-256 194a177f15dc5608d9597aa72ba77de1807f3393331fa62a2483f5a1dddf7447 during authoring. Local checks confirmed six cases, that B/C contain identical fictional body content with distinct statuses, D contains no protected draft, E's client claim conflicts with its scenario role and has no supplied response, and F omits owner. The reader ran under Python 3.12.8, exited zero and printed six rows without body contents. These are local JSON/reader checks only—not a policy test or network observation.

No HTTP request, `policy.py` import, authenticated identity, live authorization decision, browser, database, application access, full repository suite, CI or assessor calibration was run. This is supporting draft material only: canonical count, prerequisites, existing local practical, runtime registration, publication and Community Learning remain unchanged.

Source: OWASP Authorization Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html .
