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
