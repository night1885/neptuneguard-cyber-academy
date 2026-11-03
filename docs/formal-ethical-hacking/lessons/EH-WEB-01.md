# EH-WEB-01 — Read HTTP requests and responses

Draft, not published. Requires EH-NET-CAPSTONE and EH-LAB-04. This is authoring material, not activated runtime progression. Use student-built labs. Community Learning is unchanged.

## Outcomes
Identify a request method, target, headers, response status and content. Distinguish protocol semantics from testing permission and from observed implementation behavior.

## Your task and finish line
Read the message model, inspect the same clean fixture under the actual approved scope, and annotate the results of at most one GET / and one HEAD /. Complete the existing independent explanations, stop the fixture and record the actual final state. Cookies and session behaviour belong to EH-WEB-02; this fixture supplies no login to assess.

Keep three statements separate throughout: what a protocol defines, what your command requested, and what your actual evidence demonstrates. A teaching sketch is not a captured message, and an expected result is not an executed observation.

## 1. Read the existing URL before using a tool
HTTP expresses application requests and responses. A URL can identify a scheme, authority, path and query. A fragment is handled client-side rather than sent as the HTTP request target.

This lesson uses only the existing http://192.0.2.20:8000/ fixture. In this URL, http is the scheme, 192.0.2.20:8000 identifies the authority with its explicit port, and / is the root path. The permitted URL contains no query or fragment. Understanding those components does not authorize adding one to experiment.

| Item | Existing practical boundary |
|---|---|
| Client | NG-Learner in the reviewed student-built topology |
| Peer endpoint | NG-Peer, 192.0.2.20 on TCP port 8000 |
| Methods/path | At most one GET / and one HEAD / |
| Client configuration | The current bounded EH-LAB-04 forms, including first-option -q, proxy bypass and time limits |
| Excluded | New hosts, ports, paths, queries, methods, uploads, form submissions, credential tests, scanning and exploitation |

A different URL can change the action's scope even if it looks similar. Stop on a target change or unexpected redirect. Do not add curl -L, follow a Location automatically, use browser navigation that can generate extra requests, or substitute an internet endpoint. The network capstone's request allowance does not carry into this lesson.

## 2. Understand the message without inventing a wire capture
For an HTTP/1.1-style teaching example, the request line contains a method, request target and protocol version. Headers carry fields such as target authority or accepted representation types. A blank line separates the header section from any content. A response has a status line, headers and, where permitted, content.

### Request sketch — FICTIONAL, for reading only
```http
GET / HTTP/1.1
Host: 192.0.2.20:8000

```

This original schematic illustrates the existing endpoint; it is not a command, an observed curl request or a complete byte-level transcript. Do not paste it into a transport tool or send an additional manual request. GET states the method, / is the request target in this sketch, HTTP/1.1 states its illustrative version, and Host supplies the target authority. The blank line marks the end of this illustrated header section.

Do not assume the installed client or clean Python fixture uses this exact version or header set. HTTP/2 and HTTP/3 represent messages differently; not every on-the-wire exchange is textual HTTP/1.1. A standards example explains a model, not what was observed on the guest.

### What the existing tools actually expose
| Evidence source | What to read | What not to infer |
|---|---|---|
| Recorded curl command | Requested method, URL and selected client options | That it is a packet capture or proves every outgoing field byte |
| curl -i response display | Received response headers with normal GET output | That it displays the outgoing request line or a captured handshake |
| curl -I response display | Result of the requested HEAD operation | That it is merely a GET with its body hidden |
| Immediate curl exit-status record | The selected client process's outcome under its options | That this number is the HTTP response status |
| Relevant peer log entry | The fixture's recorded request context | A complete network trace or proof that every response byte reached the client |

Do not add verbose output, tracing, a proxy, packet capture or another client to fill an evidence gap. Those operations are not introduced by this lesson. If an outgoing field was not captured, describe the command's intent and state the limit rather than fabricate the field.

## 3. Annotate an actual response in a useful order
1. Identify the actual response protocol/status information, if a response was received. If only a transport diagnostic was observed, do not invent an HTTP status line.
2. Identify relevant received header fields by name and value. Keep them distinct from client progress displays, diagnostics and peer logs.
3. Locate the header/content boundary and describe whether response content actually appeared for that method/result. An omitted or prohibited body is not automatically an error.
4. Record the local client exit result separately. An HTTP error response and a connection failure are different observations; some headers arriving does not prove a complete transfer.
5. Correlate the permitted request with relevant peer evidence when available. Do not invent timestamps or assume guest clocks were synchronized.
6. State a narrow conclusion and one limitation for each observation. A header advertising a server product/version does not verify its patch level, reveal a complete architecture or establish a vulnerability.

Use your own observed values. Protocol version, header order, Date, advertised version and representation metadata can differ from examples or between separate requests. Do not replace discrepancies with a preferred transcript.

## 4. Compare GET and HEAD precisely
GET requests a representation. HEAD has GET-like semantics but the server must not send response content. This distinction is about method semantics, not just a client's display preference.

A Content-Length in a HEAD response can describe the corresponding GET representation; it does not mean that many body bytes were transferred by HEAD. Content-Length describes a length in octets in its defined context, not a general count of visible characters or a universal success indicator. Do not calculate received body size simply by copying the advertised HEAD length into the evidence table.

Some representation-dependent headers may be omitted from HEAD when generating them would require producing the content. Do not demand byte-for-byte header equality between separate GET and HEAD responses, or add requests to force them to match. If the fixture behaves unexpectedly, preserve the result and obtain reviewed troubleshooting within the actual scope.

The method and response context matter together. A missing body alone does not establish a flaw, and a 200 response alone does not establish secure authorization, correct session handling or application safety. This lesson does not implement or test authentication.

## 5. Safe and idempotent are technical terms
Safe describes intended read-only request semantics, not absence of logging, cost or risk. Idempotent describes the intended server effect of repeated identical requests, not identical response bytes. An implementation can also behave incorrectly; a method label is not an execution guarantee.

GET and HEAD have safe and idempotent semantics. That does not authorize repetition, override the two-request limit or make a real target fair game. Explain the repeated-GET question below conceptually; do not run extra requests to demonstrate it. Different responses can reflect changing representation state or metadata without making identical response bytes part of the definition of idempotence.

Keep the method's defined intent, the actual observed implementation and operational permission separate. A permitted request can still require an immediate stop if the target or setup differs from the approved brief.

## 6. Read status classes without turning them into findings
| Class | Broad semantics | Interpretation limit |
|---|---|---|
| 1xx | Informational | Do not substitute an informational observation for the final outcome of the permitted exchange |
| 2xx | Successful | Success for that response does not establish secure authorization or absence of vulnerabilities |
| 3xx | Redirection-related semantics | Read the particular status and field context; do not assume every 3xx means follow another URL |
| 4xx | Client-error semantics | An HTTP responder returned an application-level result; this is not the same as no network response |
| 5xx | Server-error semantics | The result does not uniquely identify a root cause or prove an exploitable weakness |

A status is evidence about a particular response, not a vulnerability classification or testing permission. An unexpected redirect is a scope decision before it is a navigation action. Even a Location within the same host does not grant permission for an unlisted path. Do not follow it automatically or submit credentials to make the response change.

## 7. Existing bounded practical — no extra requests
1. Establish actual authorization, the supported prerequisite setup and the course's support/evidence procedure. Recheck the reviewed topology and exact clean fixture from EH-LAB-04. Stop if the guest role, address, listener, serving directory or mandatory tool availability is uncertain.
2. From NG-Learner, make at most one GET / and one HEAD / using the current EH-LAB-04 command forms. Keep its configuration suppression, proxy bypass and connection/transfer time limits. A failed attempt is still an attempt; do not add retries or substitute another method.
3. Annotate your actual response/status information, selected headers, content behaviour and client exit result. Keep observations separate from the request sketch and protocol expectations. If a step was blocked or not attempted, say so.
4. Stop on an unexpected redirect, target change, sensitive content or setup discrepancy. Do not add a troubleshooting request simply to obtain a successful-looking screenshot. Further activity requires the actual approved bounded recovery process.
5. Stop the fixture afterward and record the relevant actual local/final state. Do not import the extra stopped-service request from EH-LAB-04 or the capstone into this lesson's two-request allowance. Preserve required minimal evidence before any approved cleanup or reset.

The clean fixture is plain HTTP. It demonstrates protocol observation, not encrypted transport. Never enter passwords, session tokens or personal data into it. No HTTPS setup, certificate verification, cookie/session lifecycle or authentication behaviour has been validated by this lesson.

## 8. Existing independent reasoning
Explain why a 200 response is not evidence of secure authorization. Explain why repeated GET responses can differ while the method remains idempotent. Identify a conclusion that requires more than a server header. Explain why an unexpected redirect is a scope decision before it is a navigation action.

These remain the existing questions, not a new assessment or an authorization for more traffic. Link relevant actual observations to your explanations, identify unknowns and distinguish a standards-based expectation from what the fixture demonstrated. No invented body length, request capture or successful result should fill a missing observation.

## Offline response-reading support
Use the [fictional HTTP response pack](HTTP-RESPONSE-CASEPACK.md), [blank worksheet](HTTP-RESPONSE-WORKSHEET.md) and their linked JSON fixture to compare GET/HEAD metadata, HTTP status, curl exit status, timeout and redirect observations without contacting an endpoint. Its optional local reader runs no curl command and follows no URL. The structured records are not native curl output or observations of the clean Python fixture. This supporting work adds no request budget, target, method, configuration change, prerequisite or compulsory deliverable, and it cannot substitute for genuine practical evidence.

## Assessment, feedback and release limits
Submit the existing minimal redacted response excerpts and explanations, not broad traffic captures. Text annotation is acceptable for drafting; screenshots are not mandatory. Use only the actual approved private submission route when access, format, collection and retention rules exist. This repository and Markdown lesson are not a learner evidence store.

A reviewer should look for method/target/context distinctions, accurate response annotation, HTTP-versus-client status separation, correct GET/HEAD and safe/idempotent reasoning, scope discipline and explicit limitations. Feedback should identify the particular unsupported inference or missing observation and request a focused correction, not a replay or out-of-scope test. Record assistance separately from independent performance. Formal grading and assessor calibration remain pending; no automatic pass, progression, access grant or award follows.

No request replay beyond the stated budget, form submission, scan, new proxy/capture or exploitation is introduced. EH-WEB-02 has its own conceptual cookie/session boundaries; the earlier plain-HTTP fixture must not silently become a login laboratory.

Source: RFC 9110, https://www.rfc-editor.org/rfc/rfc9110.html , especially sections 4, 6, 8.6, 9.2, 9.3 and 15. Sources were consulted 2026-11-02; protocol explanations do not establish implementation conformance or course release readiness.

This authoring expansion changes only the existing EH-WEB-01. It preserves EH-NET-CAPSTONE and EH-LAB-04 as prerequisites, the existing endpoint/methods and two-request maximum, the independent questions and optional supporting links. No canonical ID, prerequisite edge, reading-profile entry, runtime integration, publication flag, Discord handler, database change or deployment is added.

No HTTP client command, server startup, request trace, packet capture, guest/hardware reproduction, full repository suite, independent learner assessment or assessor calibration was executed for this authoring batch. The optional supporting pack's earlier checks retain their original scope: local fictional-data consistency/reader checks, not HTTP or two-VM validation.
