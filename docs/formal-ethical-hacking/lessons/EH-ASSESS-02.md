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

## Offline output-interpretation support
Use the [fictional observation case pack](NMAP-OUTPUT-CASEPACK.md), [blank worksheet](NMAP-OUTPUT-WORKSHEET.md) and its linked tiny XML fixture to practise state, service-label and evidence reasoning without running Nmap. The wrapper is a teaching format, not native scan output. The local Python reader is optional and requires the approved setup/material route. This supporting task does not replace genuine execution evidence for a released practical, add required deliverables, alter prerequisites or authorize any extra target, port, flag, probe or invocation.

## Validation state
No Nmap command or two-VM scan was executed during authoring. Supported versions, offline provisioning, ordinary-user behavior, timing, expected faults and end-to-end learner workflow need reproduction before publication. No new runtime integration or academy-hosted infrastructure is created. The supporting case pack records local fictional-XML parsing/field checks separately; those are not scan or platform validation.

Sources:
https://nmap.org/book/man.html
https://nmap.org/book/man-host-discovery.html
https://nmap.org/book/man-performance.html
https://nmap.org/book/port-scanning.html

## Expanded teaching: read a bounded connection check without turning it into discovery

This supplement explains the existing command and its two-invocation design. It adds no command, option, target, port or practical permission. The released brief must separately authorize this exercise; an earlier GET or HEAD allowance does not authorize a scan. Complete only the existing fictional interpretation task when authorization or tool readiness is missing.

### Predict what the command can observe

The command asks a particular client to attempt TCP connections at one literal address and one TCP port under stated scan options. It does not ask for all reachable hosts, every port or an application fingerprint. Write that question in your own words before reading any status label.

A successful connection is transport evidence. It does not supply an HTTP response, establish which representation an application would return or validate the peer's overall security. The known local fixture and a contemporaneous listener observation contribute different evidence; do not describe their information as if the scanner discovered it independently.

### Read option interactions, not isolated definitions

The TCP connect method uses the operating system's connection interface. The no-host-discovery choice asks the scanner to attempt the named endpoint rather than deciding from ordinary discovery whether to proceed. That can make a host-up label reflect an assumption. The no-name-resolution choice keeps the check from using DNS resolution for the literal target, but it does not remove the need for local link-layer addressing.

The single-port argument is a coverage boundary. Omitting it would not mean the same test with less typing. Retry and timing arguments are bounds on parts of scanner behavior, not promises about every packet the operating system sends or exact wall-clock completion. A bounded process can still return incomplete observations.

These explanations do not authorize experimenting with altered options. Compare meanings on paper and leave the original command unchanged.

### Separate three levels of identity

First establish the authorized endpoint from the brief and setup evidence. Then record the scanner's state classification for that endpoint. Finally identify where any service name came from. A name looked up from the port database is not the result of application probing.

The existing fictional case A supplies a table-derived name without a product or version. Its confidence field is the scanner's service-name confidence under its documented convention, not a probability of vulnerability. The lesson's command requests no version detection; do not add it to settle a missing fact.

### Work the state comparison — FICTIONAL

The offline pack supplies three independent cases, not a measured sequence. A labels the endpoint open, B labels it closed and C labels it filtered. They use the same address and port for teaching consistency, but their order is not evidence that someone stopped a real service between them.

Open supports acceptance under the stated scan context. Closed supports that the observed response indicated no listening application there. Filtered means the scanner cannot decide open versus closed from the available probing and responses. It does not locate a particular firewall or prove that the teaching server was stopped.

Keep the distinctions even when your expected result was simpler. Nmap describes port states as observations from a scan context rather than permanent intrinsic properties; changing the vantage point can change the classification without changing the application.

### Correlate without inventing missing links

For the actual separately authorized two-state exercise, label each observation with the target, learner context, tool version, service state and relevant time or sequence. The peer-side listener record should concern the same endpoint and state as the learner-side check. A listener listing taken after another change does not automatically corroborate an earlier client result.

If those links are missing, state that the observations cannot yet establish the comparison. Do not repair the report by borrowing a screenshot from another run. A good correlation identifies which facts were observed together and which are assumptions.

### Treat an unexpected result as a stopping decision

The exercise does not grant unlimited retries until the desired label appears. Two planned invocations remain the maximum in its design, and uncertainty does not replenish the budget. Preserve the actual output and stop if identity, setup or interpretation is unexplained.

An additional recovery step needs an explicit bounded plan within actual authorization. It must not become another host, another port or a different probe method hidden under the word troubleshooting. A missing tool is also a blocker, not permission for an unreviewed download or network reconnection.

### Report the evidence, not the expected story

A useful result statement identifies the permitted action, actual classification, supporting local listener context and limits. If the scan timed out, say what the output actually completed. Do not convert absent output into a preferred port state or say every phase finished merely because the process returned.

Leave the server stopped and record the final guest state under the original procedure. That final-state record answers a cleanup question; it does not prove that every earlier observation was correct.

### Human-led AI critique

First annotate fictional case A manually. If an approved assistant is available, supply only that invented record and ask it to identify the state, source of the service label, missing identity evidence and unsupported security conclusions. Reject any answer that adds an option or target or requests a real scan. Manual critique satisfies the same purpose.

### Formative questions with explained answers

1. Is a table-derived service name verified application identity? No. It comes from a port/protocol mapping rather than application probing.
2. Does filtered prove the service was stopped? No. The classification leaves open versus closed unresolved.
3. Are fictional cases A/B/C a before-and-after run? No. The pack supplies independent records without that timeline.
4. Does a timeout establish a complete negative result? No. The scan may be incomplete.
5. Does resolving uncertainty authorize another invocation? No. The original budget and recovery approval still apply.

Technical basis: Nmap port-state guidance, https://nmap.org/book/man-port-scanning-basics.html , and the existing command/reference sources in this lesson. No Nmap execution, packet observation, native-output validation or student two-VM reproduction is claimed by this supplement.
