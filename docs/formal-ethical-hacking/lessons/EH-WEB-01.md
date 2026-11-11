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

## Expanded teaching: read HTTP without confusing semantics, output and permission

The only practical request allowance remains the original one GET / and one HEAD / under the stated setup. This supplement introduces no new request, path, query, header mutation, redirect follow or browser action. Its examples are FICTIONAL paper interpretation, not captured messages from the clean peer.

### Decompose the existing URL

In the existing fixture URL, http is the scheme, the authority identifies the address and explicit port, and / is the path. There is no query or fragment in the authorized fixture. Learn to identify those components on paper rather than adding them to the real request to see what happens.

A fragment in a URL reference is not part of the HTTP request target. That protocol fact does not mean fragments can never affect application behavior or appear in other records; client-side code can process them. It is not a basis for placing secrets in a URL or for expanding this lesson's practical scope.

The authority also does not establish testing permission. A URL can identify a resource without certifying ownership, authorized methods, acceptable request volume or the current support/stop procedure. Keep the actual brief separate from protocol syntax.

### Read structure before assigning meaning

For a paper HTTP/1.1 message, identify its start line, header fields, separating blank line and any permitted content. Do not confuse a line printed by a client utility with a raw packet capture. The existing curl display is useful application-level output; it does not record every lower-layer event or establish the exact boundaries of TCP segments.

A response represents a particular interaction with a resource, not necessarily a direct view of the server's file storage. For the simple fixture, the file procedure deliberately makes the selected representation easy to reason about. Do not generalize that every URL path maps to a real filesystem path or that the displayed Server field independently authenticates a product.

HTTP versions share semantics while differing in message representation and transport. Textbook HTTP/1.1 lines help with reading, but they are not a faithful wire diagram for HTTP/2 or HTTP/3. This lesson does not require generating or inspecting those protocols.

### Keep three result categories distinct

The client process has an exit status under its effective options. A received HTTP response has a status code. Captured response content and metadata provide additional observations. These categories can disagree with a learner's intuition without being contradictory.

In the existing fictional response pack, an HTTP 404 can coexist with client exit zero under the specified profile. That does not transform 404 into success for the exercise objective; it means the transfer and application-result questions differ. Likewise, a timeout record with no response does not supply an HTTP status equal to the client exit number.

Use the linked pack's stated facts when reasoning about its cases. Its optional local reader parses fictional data; it is not a substitute for executing the permitted practical or proof of a supported browser's behavior. Do not silently add curl options to make the real invocation behave like a preferred case.

### HEAD metadata is not hidden response content

HEAD requests corresponding retrieval metadata without response content. An advertised Content-Length can describe the content a corresponding GET would send rather than a body transferred during HEAD. The empty body does not by itself prove the resource is empty, nor does the advertised length prove those bytes were received.

Separate requests are separate observations. Time-related fields and resource state can differ, and the semantics permit certain omissions for HEAD. Do not edit real excerpts to force exact equality. Explain whether the comparison involves a controlled fictional pairing or an actual pair of observations with their own contexts.

Content-Length is an octet count in its applicable protocol context, not a count of visible letters. The supporting pack deliberately uses simple text to make its invented counts inspectable. Do not generalize a character count to arbitrary encodings, compressed representations or transfer framing.

### Safe and idempotent do not erase effects or limits

A safe method has intended read-only semantics. Logging and other incidental effects can still occur. Idempotence concerns the intended effect on server state of repeated identical requests, not a promise of identical response bytes or a permission to keep trying indefinitely.

FICTIONAL claim: “GET is safe and idempotent, so I can repeat it until the server responds or follow any redirect.” The reasoning fails twice. Technical method properties do not enlarge the request allowance, and a redirect's Location is not a scope amendment. Stop on the original unexpected-redirect condition without contacting the new location through another tool.

A protocol label is also not a guarantee that an implementation obeys its intended semantics. The professional conclusion distinguishes what the standard specifies, what the record shows and what was not tested.

### Annotate a response with a claim ledger

For an existing permitted response, label the actual request method/target, response version/status, selected metadata, whether content arrived, the immediate client status where captured, context and limitations. Do not infer an uncollected value from a successful-looking page.

A useful interpretation might support receipt of the expected representation at the specified endpoint during the check. It does not establish authentication strength, correct per-object authorization, encrypted transport or absence of vulnerabilities. The fixture is plain HTTP and has no course login; do not insert personal data to make the demonstration feel realistic.

### Formative questions with explanations

1. Does status 200 prove secure authorization? No. It describes a response result, not a review of identity and resource-access controls.
2. Is a client exit number an HTTP status? No. It belongs to a different reporting layer and depends on the client operation.
3. Can repeated safe requests still exceed scope? Yes. Method semantics do not override volume or retry restrictions.
4. Does a Location field authorize its destination? No. It is response data to assess against the actual brief before any navigation.
5. Does a text response reveal a TCP segment layout? No. Application output alone does not provide packet-level evidence.

Technical reading: RFC 9110 and the existing fictional HTTP response pack. No new HTTP transfer, redirect, protocol-conformance test or student-platform reproduction is claimed.
