# HTTP responses and curl results — fictional offline cases

Draft support for [EH-WEB-01](EH-WEB-01.md), not a new canonical lesson, live request budget or authorization. Use only the supplied [observations.json](../fixtures/http-observations/observations.json). All records are invented. No curl invocation, HTTP transfer, redirect, browser navigation or service change is needed for this task.

## 1. Read the dataset before interpreting it
This is structured teaching JSON, not raw HTTP on the wire, native curl output or observed Python-server behavior. The five cases use HTTP/1.1-style fields for readability. Real HTTP/2/3 representation, tooling and server output may differ. They contain no real timestamps, tool version, peer logs or packet trace. Case order is not an executed timeline.

The common fictional profile does not follow redirects, does not turn HTTP error statuses into curl failures and does not decode content. It assumes no configuration-file, wrapper or extra-option override. Actual curl behavior must be interpreted with the installed version, effective options and reviewed configuration; a pasted command alone does not prove that the local configuration matches this profile.

Every request label is GET / or HEAD / at http://192.0.2.20:8000/. The Location value in E is an untrusted fictional destination, not a second target or a link to visit. Dataset labels do not establish real ownership, isolation, reachability or permission.

## 2. Keep three kinds of result separate
- The curl exit status reports the client operation under its options and failure conditions. It is not an HTTP status code.
- The HTTP status describes the particular response's protocol semantics when a response was captured. It is not a vulnerability score or proof of correct authorization.
- Captured headers/content describe the supplied message material. A representation-length header is not always the number of body bytes transferred.

For real evidence, record the exact request, effective configuration, command status, relevant output and uncertainty. Capture `$?` immediately before another shell command changes it. Never replace your observations with this fictional pack.

## 3. Case A — completed GET
The supplied GET record has curl exit 0, HTTP status 200, Content-Length 32 and the 32 UTF-8 bytes of `Authorized foundation exercise.` followed by a newline. This supports consistency within the invented record. It does not establish authenticated access, secure implementation, TLS protection, a particular server product or a successful real lab run.

Identify method, target, protocol/version field, status, representation metadata and content separately. The newline is part of the content; do not count only visible letters. More generally Content-Length counts octets, not Python characters. These examples intentionally use simple ASCII text and no content coding.

## 4. Case B — HEAD with representation metadata
B describes the same fictional selected representation as A, but uses HEAD. It advertises Content-Length 32 and contains no response content. That is not a contradictory 32-byte transfer or proof the resource is empty: HEAD does not send response content, and a supplied Content-Length describes what the corresponding GET response would have sent.

Do not demand identical headers from every separately observed GET and HEAD. Representation-dependent fields can vary or be omitted under the protocol's rules. This controlled fictional pairing is an illustration, not evidence that a live server produced matching responses.

In the earlier authorized curl examples, -i includes response headers with GET content; -I asks for HEAD. Do not confuse lowercase i and uppercase I or add a new request to test the distinction outside the released budget.

## 5. Case C — an HTTP error is still a response
C has HTTP status 404 and a short response body, but curl exit 0 under the stated no-fail profile. By default, curl does not classify HTTP error status codes as client-transfer failure. Options such as --fail alter HTTP error handling; they do not change the server's HTTP status into a transport timeout. Do not add options to the existing lab command without an approved change.

Explain what a captured 404 establishes about an HTTP responder and what it does not establish about every resource, the correct peer, network isolation or application security. A server can return an error message successfully at the transfer layer.

## 6. Case D — a timeout with no response captured
D supplies curl exit 28, a fictional timeout note and response:null. curl's exit code 28 indicates a timeout condition. This record supplies no completed HTTP response; it does not contain an HTTP status 28 or a server error page.

Do not infer the unique cause or phase from the exit number. Connection establishment, a later wait and other configured timeout conditions need their own observations. In other real runs, a timeout can occur after some response information has arrived. This case's missing response is an explicit dataset fact, not a universal meaning of exit 28. Preserve uncertainty rather than calling every timeout a stopped service or firewall block.

## 7. Case E — redirect is a scope decision
E has HTTP status 302, a Location outside the fictional lab boundary and curl exit 0. The profile does not follow it. A completed transfer of a redirect response is not approval to contact the destination. HTTPS in the destination string would not grant authority either.

The correct exercise response is to stop and use the actual support/scope process, not add -L, switch to a browser or try the destination manually. The earlier proxy-bypass and time-limit options do not themselves prove isolation or make an unapproved redirect safe. No Location is followed in this dataset.

## 8. Inspect the reviewed file locally
Read the JSON as text first. If Python is available through the approved setup/material route, save this optional reader as read_http_cases.py beside observations.json:

```python
from pathlib import Path
import json

raw = Path("observations.json").read_bytes()
if len(raw) > 16384:
    raise ValueError("Use only the tiny reviewed teaching fixture")
data = json.loads(raw)
if data.get("synthetic") is not True:
    raise ValueError("Expected fictional teaching data")
for case in data["cases"]:
    response = case["response"]
    status = "not-captured"
    advertised = "not-supplied"
    captured = "not-captured"
    if response is not None:
        status = str(response["status"])
        advertised = response["headers"].get("Content-Length", "not-supplied")
        captured = str(len(response["body_text"].encode("utf-8")))
    print(case["id"], case["request"]["method"], case["curl_exit"], status, advertised, captured)
```

Run `python3 -B read_http_cases.py` in the disposable fixture directory. It reads local JSON and prints six columns: case, method, client exit, HTTP status or missing indicator, advertised length, captured-body byte count or missing indicator. It sends no request and follows no URL. This is a fixed-schema teaching reader, not an HTTP parser, general report importer or resource-hardening design.

If tools or reviewed transfer instructions are missing, complete text inspection and record the blocker. Do not download packages, reconnect an isolated guest or contact the dataset addresses.

## Deliverables and author checks
Complete the [worksheet](HTTP-RESPONSE-WORKSHEET.md), explain one misleading conclusion per case, and distinguish the fictional dataset from any actual permitted practical evidence. These are supporting reasoning tasks, not new compulsory assessment criteria or calibrated pass decisions. Real learner work requires the approved private workflow; no personal data or credentials belong in this repository.

The 2304-byte UTF-8 fixture had SHA-256 bd2557a18e8eb85159107f5e735e4eec0f40870e3f86da2b3fa702843d1a74c6 during authoring. Local checks verified five unique case IDs, the fixed request target/method set, the GET body-length fields, A/B's paired metadata with B's empty body, C's 404/client-zero combination, D's timeout/no-response fields and E's redirect/no-follow profile. The reader ran on Python 3.12.8, exited zero and printed five rows. These are consistency/reader checks, not five network transfers or a protocol conformance suite.

No curl, live HTTP endpoint, redirect, browser, two-VM practical, supported-platform reproduction, full repository suite, CI or grading calibration was executed for this batch. Catalogue count, existing GET/HEAD request budget, methods, targets, prerequisites, runtime integration, publication and Community Learning remain unchanged.

Sources:
https://www.rfc-editor.org/rfc/rfc9110.html
https://curl.se/docs/manpage.html
https://everything.curl.dev/cmdline/exitcode.html
