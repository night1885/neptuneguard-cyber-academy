# Standalone web foundations — network, HTTP and transport reasoning

Draft paper worksheet only. Example addresses and messages are fictional; do not contact them. No scans, requests, certificate operations or configuration changes are authorized.

## Network model

An address identifies an interface in context; a prefix describes an address block; a route selects a path. None supplies testing permission. A matching prefix alone does not prove a usable link, permitted forwarding or a listening service.

Worked paper case: a simplified table has 192.0.2.0/24 on an exercise interface and a default route elsewhere. For 192.0.2.20, the /24 is the more specific destination-prefix match. This reasoning does not prove delivery or approve the extra route. In a lab whose approved topology has no default route, the discrepancy needs investigation, not a test request.

Guided task: list the separate facts needed to reason about link configuration, route choice, service availability and permission. Distinguish a local route decision from an observed response. Keep the original [network lesson](../lessons/EH-NET-01.md) requirements intact before any later practical use; this worksheet does not reproduce its two-VM prerequisites.

## HTTP model and worked record

HTTP carries requests and responses. A response status describes that response, not an application-security verdict. HEAD has GET-like semantics without response content; a representation length advertised in a HEAD response is not proof that those content bytes were transferred.

Fictional record: GET / returns status 200 and a small representation; a separate HEAD / returns status 200, a representation-length header and no response content. Explain why the lack of HEAD content is consistent with the method and why neither 200 establishes secure resource authorization. Separate responses need not have identical headers.

An unexpected redirect does not expand scope. Safe/idempotent method semantics are not promises of zero risk or permission to repeat requests. The shared [HTTP lesson](../lessons/EH-WEB-01.md) retains its own fixture, setup, GET/HEAD budget, proxy/time-limit controls and stop rules. No practical permission or request budget is inherited by this paper exercise.

## Transport boundary

TLS can protect traffic between its participating endpoints. Confidentiality, integrity and peer identity are distinct; encryption without the intended identity check is not equivalent to authenticated service identity. TLS does not repair application authorization or automatically protect stored logs and evidence.

Worked architecture: a fictional browser has an authenticated TLS connection to a proxy; the proxy-to-application link is unspecified. Mark the known protected hop and the unknown downstream hop. A valid browser-facing certificate does not establish downstream protection or database-access correctness. Read the shared [TLS explanation](../lessons/EH-TLS-01.md); no HTTPS server or certificate setup is added.

## Independent variant and review

A learner sees a successful HTTP response, an unexpected redirect and an HTTPS label on a diagram. They conclude the whole service is secure and propose following the redirect. Identify unsupported conclusions, missing evidence and the scope decision. Do not resolve the redirect or inspect a real service.

Submit only fictional reasoning when an approved private route exists. A reviewer should expect bounded claims, protocol/permission separation and explicit uncertainty. Real topology, HTTP and TLS practical evidence remains separate. Missing supported setup is a blocker, not a reason to contact a substitute endpoint. No W00/W01 completion is established.
