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

## Activity
Redraw the sequence without copying it. For each line record sender, intended recipient, supplied observation, next unproven assumption and the extra evidence an authorised reviewer would need. Compare D03-D10 in the [paper cases](../fixtures/domain-foundations/cases.json). Do not collect tickets, session keys, hashes or exports to fill a missing field. No kinit/klist, directory, cache or credential operation is authorised here.

Sources: https://www.rfc-editor.org/rfc/rfc4120.html (especially sections 1.3, 1.4, 1.6 and 3) and https://learn.microsoft.com/en-us/windows-server/security/kerberos/kerberos-authentication-overview . RFC 4120 is a base protocol reference; current extensions, algorithms and platform guidance require further review.
