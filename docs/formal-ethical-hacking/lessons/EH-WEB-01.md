# EH-WEB-01 — Read HTTP requests and responses

Draft, not published. Requires EH-NET-CAPSTONE and EH-LAB-04. Proposed ID only; not registered in runtime progression. Use student-built labs.

## Outcomes
Identify a request method, target, headers, response status and content. Distinguish protocol semantics from testing permission and from observed implementation behavior.

## Understand the exchange
HTTP expresses application requests and responses. A URL can identify a scheme, authority, path and query. A fragment is handled client-side rather than sent as the HTTP request target. This lesson uses only the existing http://192.0.2.20:8000/ fixture: no new paths, queries, hosts or methods are authorized.

For an HTTP/1.1-style teaching example, the request line contains a method, request target and protocol version. Headers carry fields such as the target authority or accepted representation types; a blank line separates the header section from any content. A response has a status line, headers and, where permitted, content. HTTP/2 and HTTP/3 represent messages differently; do not assume every on-the-wire exchange is textual HTTP/1.1.

GET requests a representation. HEAD has GET-like semantics but the server must not send response content. A Content-Length in a HEAD response can describe the corresponding GET representation; it does not mean that many body bytes were transferred. Some representation-dependent headers may be omitted when generating them would require producing the content. Do not demand byte-for-byte header equality between separate requests.

## Safe and idempotent are technical terms
Safe describes intended read-only request semantics, not absence of logging, cost or risk. Idempotent describes the intended server effect of repeated identical requests, not identical response bytes. Neither property authorizes testing a real target, overrides a request budget or guarantees that an implementation behaves correctly.

Status classes group responses: 1xx informational, 2xx successful, 3xx redirection, 4xx client-error and 5xx server-error semantics. A status is evidence about a particular response, not a vulnerability classification. A redirect never expands the authorized target list. Do not add curl -L or follow an unexpected Location automatically.

## Bounded practical
After the normal topology and fixture checks, make at most one GET / and one HEAD / using the EH-LAB-04 commands, which include proxy bypass and time limits. Stop on an unexpected redirect, target change or setup discrepancy. Annotate your actual response: protocol/status line, selected headers and whether content arrived. Do not claim HEAD transferred a body merely because a representation length is advertised. Stop the fixture afterward and record final state.

The clean fixture is plain HTTP. It demonstrates protocol observation, not encrypted transport. Never enter passwords, session tokens or personal data into it. No HTTPS setup or certificate verification has been tested by this lesson.

## Independent reasoning
Explain why a 200 response is not evidence of secure authorization. Explain why repeated GET responses can differ while the method remains idempotent. Identify a conclusion that requires more than a server header. Explain why an unexpected redirect is a scope decision before it is a navigation action.

## Offline response-reading support
Use the [fictional HTTP response pack](HTTP-RESPONSE-CASEPACK.md), [blank worksheet](HTTP-RESPONSE-WORKSHEET.md) and their linked JSON fixture to compare GET/HEAD metadata, HTTP status, curl exit status, timeout and redirect observations without contacting an endpoint. Its optional local reader runs no curl command and follows no URL. The structured records are not native curl output or observations of the clean Python fixture. This supporting work adds no request budget, target, method, configuration change, prerequisite or compulsory deliverable, and it cannot substitute for genuine practical evidence.

## Assessment and limits
Submit minimal redacted response excerpts and your explanations, not broad traffic captures. No request replay beyond the stated budget, form submission, scanning or exploitation is introduced. The commands were not executed in this authoring batch; do not substitute expected output for your observations. Formal grading and student-platform reproduction remain pending. The supporting pack records only local fictional-data consistency/reader checks, not HTTP or two-VM validation.

Source: RFC 9110, https://www.rfc-editor.org/rfc/rfc9110.html .
