# EH-NET-03 — Names, DNS and failure boundaries

Draft; not published. Requires EH-NET-02. Conceptual and paper exercises only: the offline lab currently has no authorized DNS service. Do not attach an external resolver or query public infrastructure for this lesson.

## Outcomes
Explain a resolver, distinguish DNS records from IP routing, and avoid treating every failed application request as a DNS failure.

## Why names exist
Applications can use human-readable names rather than literal addresses. DNS organizes names hierarchically and returns typed information, called resource records. A resolver obtains answers on behalf of a client, potentially using cached data or other servers. An authoritative server answers for the zones it serves. Recursive resolution and authoritative service are different roles, even when one installation can perform more than one role.

A and AAAA records associate names with IPv4 and IPv6 addresses. Other record types carry other information. DNS is not merely a single global name-to-IP spreadsheet. Answers can change over time and cached information has a lifetime. A returned address does not certify target ownership, application availability or testing authorization.

## DNS is not routing
Name resolution helps obtain information used by an application. Routing chooses paths for IP destinations. A successful name lookup does not establish transport reachability. A working route to an address does not establish that a name resolves.

The earlier clean-peer requests used a literal IPv4 address and bypassed environment-configured proxies. Their intended path does not require resolving a target hostname. If that request fails, a missing DNS server is not an adequate explanation by itself. Do not 'fix DNS' by adding internet connectivity to an isolated exercise.

Local name lookup can also involve sources other than DNS, depending on the operating system. A hosts-file entry is not a DNS record served by an authoritative DNS server. This lesson does not authorize changing system resolver settings or hosts files.

## Fictional diagnostic cards — not transcripts
A. A configured name resolves to an address, but the transport attempt times out. Name resolution succeeded in that observation; further diagnosis concerns the specified path, endpoint and controls, without assuming one root cause.

B. An application reports that a name could not be resolved. That is not evidence that its intended web service is down. The request may not have reached the stage of contacting that service.

C. The literal-address request to the clean peer fails while its service is stopped. Adding a public resolver would not start the service and would violate the intended setup.

These cards are provided observations for reasoning practice, not executed lab evidence.

## Independent work
For each card, identify the observed fact, one justified interpretation, two unknowns and the next question to ask. Explain the difference between a cached answer and an authoritative role. Explain why a DNS answer containing a new address never expands an assessment's target scope automatically.

## Assessment and next gate
Submit a short concept map linking application, resolver, records, destination address, routing and transport. Keep provided fictional material labelled. Review clarity and causal reasoning rather than memorized tool output. A practical DNS fixture, resolver configuration and query permissions need separate design and validation before any DNS lab is released.

Source: RFC 1034, https://www.rfc-editor.org/info/rfc1034/ . This foundational reference introduces DNS concepts; it is not a complete account of all later DNS standards or a tested guest configuration.

## Expanded teaching: reason about name resolution without leaving the offline lab

This entire supplement is conceptual and paper-only. No DNS service or query is authorized by it. Do not run resolver tools, change hosts files, change resolver settings or attach an external adapter to reproduce its examples. Every named scenario is FICTIONAL.

### Separate the question, the answer and the next action

A name-resolution request concerns a name, record type and context. An answer can provide information an application may use, but the answer is not the resulting connection. Keep the chain explicit: application chooses a name; its lookup mechanism obtains relevant information; the application selects a destination; routing and transport then participate in a possible exchange.

The chain is a mental model, not proof that every application performs those steps in exactly the same order or uses only DNS. Local sources and caches can affect lookup behavior. A hosts-file mapping is local configuration, not evidence of an authoritative DNS response. Distinguish those sources in a report rather than calling all successful lookups “DNS worked.”

The earlier literal-address HTTP fixture does not require a target-hostname lookup on its intended direct path. If that fixture fails, adding a public resolver neither establishes the intended listener nor repairs an unexplained network attachment. It also breaches the stated offline design.

### Resolver and authoritative server are roles

A recursive resolver obtains answers on a client's behalf and can use cached information. An authoritative server answers for zones it serves from its authoritative data. “Authoritative” describes a DNS role; it does not certify that the returned application is safe, that the record owner has authorized an assessment or that the answer establishes legal ownership of the destination.

A useful paper diagram has separate boxes for the application, lookup source or resolver, authoritative data, returned record and destination service. Mark an unknown relationship as unknown. Do not draw a completed HTTP exchange merely because a name-to-address answer was supplied.

### Interpret typed answers and time

A records associate names with IPv4 addresses, and AAAA records with IPv6 addresses. They are not interchangeable copies of a universal address field. One successful answer for one type does not establish that every desired type or destination is available.

Caching allows an answer to be reused for a period described by its time-to-live rules. TTL is not a guarantee that a record's value will change when a timer expires, and cache expiry is not a declaration that the application service is down. Different caches can hold answers obtained at different times.

The simple “discard at expiry” model also needs a limitation: RFC 8767 describes serving stale data in specified resiliency circumstances. Do not assume an observed answer's age or freshness from a single displayed number without knowing the resolver's behavior. This is reading context, not a recommendation to configure stale serving in the lab.

### A failed lookup is not one universal failure

Distinguish a supplied observation that a queried name does not exist, an observation that resolution failed, and a timeout in obtaining an answer. These do not make the same claim. A failure to resolve does not establish that the intended HTTP service was contacted and found unavailable.

When the record lacks response details, preserve that gap. “The application reported a name-resolution error” is narrower and more defensible than inventing an authoritative name-error response. No tool output is supplied by this lesson, so do not create a transcript to make the scenario appear executed.

### Worked cases — FICTIONAL paper review

Case 1: a worksheet supplies a successful A answer, followed by a transport timeout. Justified interpretation: the stated name lookup returned an IPv4 address, and the subsequent operation did not complete within its bound. Unknowns include whether the intended service was listening and whether the path allowed the exchange. The answer does not identify the timeout's cause.

Case 2: a worksheet supplies an application name-resolution error and no connection record. Justified interpretation: the application did not obtain the needed lookup result in that observation. Whether a packet reached the intended service remains unestablished; do not report its HTTP status as if it answered.

Case 3: two provided records show different answers at different times. Possible explanations include a legitimate change or different cached state. The difference alone does not prove tampering, ownership transfer or an authorization change. Identify what context and provenance are missing before choosing an explanation.

Case 4: a name in a fictional assessment brief now resolves to an address absent from the explicit target authorization. The lookup does not expand scope. Stop practical action and seek the actual scope decision rather than testing the new address to learn who owns it.

### A diagnostic matrix for paper reasoning

| Supplied observation | Supported statement | Unsupported leap |
|---|---|---|
| A lookup returned an address | That lookup supplied address information | The destination application is healthy |
| A transport request timed out after lookup | The later operation did not complete in its bound | DNS necessarily caused the failure |
| A name-resolution error was reported | A needed lookup result was not obtained as reported | The web service returned an error |
| A cached answer is present | Stored lookup information was available | It exactly matches the current authoritative state |
| A new address appears | The supplied answer differs | Testing permission automatically follows the answer |

### Human-led AI critique — FICTIONAL only

First critique this statement manually: “The name returned an address, so that server is ours to test and the website must be working.” Identify the unsupported authorization and availability conclusions.

If an approved assistant is available, give it only the fictional sentence and the scope rule above. Ask it to separate the observed lookup information from assumptions and name the missing evidence. Reject invented DNS outputs, external-query suggestions or claims that a lookup grants permission. Do not upload real domain inventories, client records, identities or logs. Manual critique fully satisfies the same learning objective.

### Exercises and explained answers

1. Does a successful A answer prove an AAAA answer exists? No. They are different record types and require distinct evidence.
2. Must a value change when its TTL expires? No. TTL concerns caching behavior, not a promise that authoritative data will change.
3. Is a hosts-file entry an authoritative DNS record? No. It is a different lookup source; do not label its provenance incorrectly.
4. Does a resolver error prove an HTTP server returned a failure? No. Contact with that application may not have occurred.
5. Why does a new returned address require a scope decision? Lookup data is not an authorization amendment. Practical action remains bounded by the actual approved brief.

Retain the original concept-map and fictional-label requirements. No practical DNS fixture, resolver configuration or query permission is added.

Technical reading: RFC 1034 for foundational DNS roles; RFC 9199 for authoritative and recursive service distinctions; RFC 8767 for the stale-data limitation; RFC 9520 for resolution-failure caching context. These references do not validate a learner lab or provide permission to query real systems.
