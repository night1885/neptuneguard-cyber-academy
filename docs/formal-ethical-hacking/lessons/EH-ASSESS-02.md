# EH-ASSESS-02 — Check one authorized TCP endpoint

Draft practical, not published or executed by this authoring batch. Requires EH-ASSESS-01, EH-LAB-03 and EH-LAB-04. The released lab must separately approve this narrow scan scope before any student execution. Earlier GET/HEAD-only permissions do not include it.

## Outcomes
Explain every argument in a bounded TCP connect check, compare running and stopped service observations, and distinguish a port label from verified application identity.

## Tool readiness
Use Nmap on NG-Learner as a normal non-root user. Confirm `nmap --version` locally and record it. Obtain software only through an approved, documented provisioning route and review licensing; this draft supplies no validated offline installer. Do not use sudo, download packages ad hoc, or connect the isolated guest to another network if Nmap is missing. Complete the paper interpretation task instead and report the blocker.

Before execution confirm both guests, distinct addresses, exactly the intended internal adapters, IPv4/IPv6 routes and no unexplained forwarding/integration paths using the existing setup lessons. Stop on uncertainty. Do not treat this scan as proof of isolation.

## Prepare the running state
On NG-Peer start only the empty-directory Python HTTP fixture from EH-LAB-04, bound to 192.0.2.20:8000. Inspect its local listener and keep its terminal visible. Do not start a service from a personal directory or disable the firewall wholesale.

On NG-Learner, once the actual lab authorization is confirmed, run exactly:
```sh
nmap -sT -Pn -n -p 8000 --max-retries 1 --host-timeout 15s 192.0.2.20
```
Record actual output and exit status. Do not add options from internet examples. This is one planned invocation, not an unrestricted retry allowance.

## Explain the choices
- -sT selects TCP connect scanning through the operating system's connection interface, rather than requiring a raw-packet scan. It is observable activity, not stealth.
- -Pn skips the normal host-discovery decision and asks Nmap to attempt the requested scan on the supplied address. A resulting host-up label may reflect this assumption rather than an independent discovery result.
- -n disables name resolution. The target remains one literal address.
- -p 8000 selects that single TCP port; omitting it would change the requested coverage.
- --max-retries 1 limits Nmap's scan-probe retransmissions; it is not an exact bound on all OS-generated packets.
- --host-timeout 15s gives up on that host's scan after the specified scan time budget. It is not a guarantee that every phase of a process completes within exactly 15 seconds, and a timed-out scan can be incomplete.

On a local Ethernet-style virtual link, Nmap or the operating system can still need ARP address resolution. -Pn is not a promise of zero discovery-related link-layer activity. This is one reason exact topology and target identity matter.

## Interpret only what was observed
Open indicates that Nmap observed the port accepting connections under that scan. Closed indicates no listening application according to the observed response. Filtered indicates that the scan cannot determine open versus closed because probes/responses are obstructed. Timeouts and incomplete output require careful interpretation rather than invented certainty.

A SERVICE column can be a conventional port-number label from Nmap's database. This command requests no -sV version detection. Do not claim a product/version, vulnerability or HTTP response from that label. Correlate with the known fixture and peer-side listener evidence without pretending the scanner performed application identification.

## Make one controlled change
Stop the server with Ctrl-C on NG-Peer. Inspect its listener state again. Make one more invocation of the exact same Nmap command from NG-Learner. Record the result and compare. Two planned Nmap invocations total are allowed by this draft exercise design; they may generate multiple packets.

Do not restart or repeatedly rescan to force a preferred output. If observations differ from expectations, stop and report them. Additional retries or tests need an explicit bounded recovery plan within actual authorization. Leave the server stopped and record final guest state.

## Submission
Provide your approved plan reference, exact command, version, minimal before/after evidence, listener correlation, source of any service label and at least three limitations. No scan result establishes whole-host security or complete network isolation. Do not copy fictional or author output as your own.

## Validation state
No Nmap command or two-VM scan was executed during authoring. Supported versions, offline provisioning, ordinary-user behavior, timing, expected faults and end-to-end learner workflow need reproduction before publication. No new runtime integration or academy-hosted infrastructure is created.

Sources:
https://nmap.org/book/man.html
https://nmap.org/book/man-host-discovery.html
https://nmap.org/book/man-performance.html
https://nmap.org/book/port-scanning.html
