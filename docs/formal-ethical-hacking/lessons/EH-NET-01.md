# EH-NET-01 — Addresses, prefixes and route selection

Draft; not published or executed on student hardware. Requires EH-LINUX-03 and EH-LAB-03. Proposed lesson ID only, not runtime registration. Students operate their own clean two-VM lab.

## Outcomes
Distinguish a link-layer address, IP address, subnet prefix and route. Explain the lab's directly connected path without assuming a gateway is necessary.

## Build the mental model
A virtual network adapter has a link-layer identity such as a MAC address. An IP address identifies an interface at the network layer; one interface can have multiple addresses. A prefix describes a block of addresses sharing leading bits. None of these identifiers grants testing permission or permanently identifies a person.

IPv4 uses 32-bit addresses. In 192.0.2.10/24, the prefix length says that 24 leading bits describe the network portion. The corresponding block is 192.0.2.0/24. Under this ordinary /24 convention, the example endpoints .10 and .20 are distinct host addresses inside the same block. Do not infer a universal host-count rule for every prefix: special cases and configuration matter.

Two interfaces configured in the same prefix do not automatically have a working path. They still require the intended virtual link, distinct addresses, correct state and compatible controls. Conversely, a shared prefix is not evidence that other addresses are authorized targets.

## Routes are decisions, not permission
A route identifies how a system should handle destinations matching a prefix. For destinations on the lab's directly connected network, a router is not normally needed. A default route is a fallback, not a requirement for communicating with the clean peer. In the ordinary destination-prefix model, the most specific matching prefix is preferred; Linux policy routing can add further selection rules.

This lab deliberately has no exercise default gateway or DNS server. Adding a default route to fix an unrelated error changes assumptions and is not an authorized troubleshooting shortcut.

## Read-only guest observation
Confirm the terminal is NG-Learner and inspect:
```sh
ip -br link
ip -br address
ip route
ip -6 route
ip route get 192.0.2.20
```
The route-get command asks the local kernel for a route decision; it is not a reachability test and does not by itself send a test request to the peer. Record the selected interface and source address if a route is returned. Do not substitute an external destination.

If the state differs from EH-LAB-03, stop practical requests and document the discrepancy. Do not flush addresses, disable IPv6 or add routes simply to resemble an example.

## Worked paper example — FICTIONAL
A simplified route table contains 192.0.2.0/24 on the exercise interface and a hypothetical 0.0.0.0/0 through another interface. Both match 192.0.2.20, but /24 is the more specific prefix. This explains ordinary selection; it does not approve the extra interface or prove isolation. The hypothetical default route would require investigation against this lab's intended configuration.

## Independent reasoning
1. Explain why .10/24 and .20/24 can communicate without DNS or a default gateway in the intended topology.
2. Explain why identical addresses on both guests are a configuration problem, not proof of connectivity.
3. On paper only, compare 192.0.2.10/24 with 192.0.2.130/25. Explain why asymmetrical prefix assumptions can complicate communication. Do not change the guest settings for this question.
4. State what a route decision cannot prove about forwarding, filtering or the destination service.

## Evidence and assessment
Submit a minimal topology, selected route observations and reasoned answers. Review accuracy, uncertainty and scope. No scans or unlisted destinations are permitted. No automated pass or access grant follows from submission.

Source: RFC 4632, https://www.rfc-editor.org/info/rfc4632/ . The source supports CIDR and longest-prefix concepts, not validation of this exact Linux or hypervisor setup.
