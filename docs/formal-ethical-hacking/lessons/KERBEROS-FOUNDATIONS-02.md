# DOMAIN-F2 — Kerberos: legitimate flow and evidence boundaries

Draft conceptual K11 support after [DOMAIN-F1](DOMAIN-FOUNDATIONS-01.md). This is a simplified reading model, not a packet trace, ticket generator/parser, cryptographic implementation or permission to inspect a real cache. No protocol or Windows/domain execution was performed.

## Roles and credentials
A principal is a named participating identity; a client acts for a principal and a target service has its own intended identity. The KDC is the trusted ticket/session-key service. AS and TGS are logical functions, not necessarily separate machines. In Windows domains the KDC uses AD DS account information. A TGT supports requesting service credentials; it is not itself an application permission decision.

Distinguish a ticket from the complete credentials needed to use it. Session-key material and authenticators participate in the protocol; merely seeing a ticket-shaped blob is not validation. Do not build a toy HMAC/JWT object and call it a Kerberos ticket. This lesson implements neither the protocol nor Windows-specific extensions.

## Simplified successful sequence

```text
Client -> KDC/AS       Initial authentication-service request (AS-REQ)
KDC/AS -> Client       AS-REP: TGT and protected client key material
Client -> KDC/TGS      TGT-based service-ticket request (TGS-REQ)
KDC/TGS -> Client      TGS-REP: credentials for the intended service
Client -> Service     Service ticket and authenticator (AP-REQ)
Service -> Client     AP-REP where mutual-authentication exchange is used
Service/application   Separate resource-and-operation authorisation
```

Read the first six lines as message relationships, not proof that the final line succeeds. Pre-authentication, errors, renewals, cross-realm paths and Windows extensions can add/change details. This is not an exhaustive flow or assurance that every deployment uses one password-based initial mechanism.

In the ordinary simplified key relationships, the TGT is protected for the ticket-granting service, while a service ticket is protected for its target service. The client receives protected reply/session-key material; it does not need to decrypt the TGT's protected contents to use the protocol. An authenticator demonstrates relevant session-key possession/freshness within the protocol's checks. Correct validation/replay handling and environmental assumptions matter; an unexamined timestamp alone is not a universal replay defence.

## What each observation establishes
A cached TGT does not show that a target service was reached. A ticket issued for a service does not show that the service accepted it. Service authentication does not authorise every record, method or field. RFC 4120 section 1.4 explicitly separates authorisation from Kerberos authentication. The application must apply the appropriate permissions; carrying authorisation data is not permission for the reviewer to assume every requested action is allowed.

Mutual authentication is a capability whose actual use needs evidence from the relevant exchange and application behaviour. Do not claim both directions were verified from a client-authentication observation alone. Initial identity verification also does not automatically protect every subsequent application byte; required integrity/confidentiality depends on the actual protocol/application protection.

## Troubleshoot without a single-cause guess
Name the failed stage before interpreting it. Name resolution, intended service-principal mapping, time, reachability, principal/key configuration, protocol policy and application permission concern different questions. A failed lookup is not a KDC authorisation denial. A clock-related diagnostic does not prove the password wrong. A service-ticket failure without complete context does not establish one unique root cause. Do not change clocks, SPNs, keys or policy to force success without a separately approved procedure.

## Walk through the evidence one stage at a time
| Stage | Question the learner should ask | What a later success still would not prove |
|---|---|---|
| Intended destination and identity | Which service instance does the client intend to use? | Correct naming alone is not service reachability or authentication |
| AS exchange | What initial credentials are actually supplied or observed? | A TGT does not prove a target service exchange occurred |
| TGS exchange | For which intended service were credentials issued? | Issuance does not prove acceptance by that service |
| AP exchange | What validation and authentication direction are supplied by the evidence? | Client authentication alone is not evidence of mutual authentication |
| Application authorization | Which subject, resource and operation does the policy permit? | One permitted read does not establish edit or other-record permission |
| Protected application traffic | What application protection was actually negotiated and used? | Initial authentication alone does not prove every later byte was confidential |

This is an evidence checklist, not a mandatory fresh sequence for every connection: cached credentials and existing contexts may avoid a new AS or TGS exchange for a particular operation. Conversely, the absence of a fresh event in a partial record does not prove authentication never happened. A complete conclusion requires the relevant context and actual platform behavior, not invented messages.

In a fictional report-service example, separately label the client principal, the intended service identity, the KDC-issued credentials, the service's supplied acceptance result and the policy for a selected report read. Only connect boxes when the scenario supplies the edge. Do not treat a name, blob or diagram arrow as successful cryptographic validation.

## Time, replay handling and diagnostic restraint
Kerberos validation includes time/freshness and replay considerations. A timestamp within an allowed skew is not by itself a universal replay defense. RFC 4120 describes replay-cache requirements and permitted alternative protection under specified conditions. Do not turn the RFC's illustrative skew value into a universal course or deployment setting, and do not alter clocks or disable replay protections to make a scenario appear successful.

| Supplied symptom | Distinguish first | What not to do in this paper lesson |
|---|---|---|
| Name resolution failed | Destination/name lookup versus a completed KDC/service exchange | Query another domain or change DNS settings |
| Clock-related diagnostic | A stage-specific time check versus password correctness | Change clocks or relax policy |
| Service identity unresolved | Requested identity/mapping versus one unique key/secret fault | Register or edit SPNs, collect keys or guess credentials |
| Authenticated client, denied operation | Identity verification versus resource/operation permission | Treat the denial as permission to test other objects |

The appropriate next step here is to state missing evidence and request an approved clarification on paper. These distinctions do not authorize diagnostic commands, cache inspection or protocol traffic. Base RFC semantics and current Windows behavior must still be reviewed for a separately provisioned practical.

## Activity
Redraw the sequence without copying it. For each line record sender, intended recipient, supplied observation, next unproven assumption and the extra evidence an authorised reviewer would need. Compare D03-D10 in the [paper cases](../fixtures/domain-foundations/cases.json). Do not collect tickets, session keys, hashes or exports to fill a missing field. No kinit/klist, directory, cache or credential operation is authorised here.

Sources: https://www.rfc-editor.org/rfc/rfc4120.html (especially sections 1.3, 1.4, 1.6 and 3) and https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview . RFC 4120 is a base protocol reference; current extensions, algorithms and platform guidance require further review.
