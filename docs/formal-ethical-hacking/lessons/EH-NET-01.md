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

## Expanded teaching: work from the destination back to the evidence

These additions develop the existing address and route observations. They add no targets, route changes, address changes or probes. Every worked table below is FICTIONAL paper analysis, not a required configuration or a captured transcript.

### Separate the identifier from the boundary

The lab uses several identifiers for different purposes. A guest name helps describe a role. A MAC address identifies a link-layer interface in the relevant context. An IP address participates in network-layer addressing. A prefix describes a block. None is an authorization record. A second address discovered in a table is not automatically another permitted target.

A single interface can have more than one address, and a host can have more than one interface. Therefore “the machine's IP” can conceal a consequential choice. In an observation record, identify the guest, the relevant interface, its address/prefix and the destination being considered. Do not collect unrelated interfaces or personal identifiers for decoration.

### Read the prefix bit by bit

An IPv4 address contains four octets, each eight bits. The prefix length counts leading bits; it is not a number of devices that are responding or a scan range. With /24, the first three octets supply the prefix bits. For the lab's addresses, 192.0.2.10/24 and 192.0.2.20/24 both belong to the block 192.0.2.0/24.

For a /25 inside this /24, the first bit of the final octet also belongs to the prefix. On paper, the last octet 10 is 00001010, 20 is 00010100 and 130 is 10000010. The first two have a leading zero; 130 has a leading one. The resulting /25 blocks are 192.0.2.0/25 and 192.0.2.128/25. Do not configure these variants in the guests for this exercise.

This explains the existing asymmetry question. The .10/24 endpoint considers .130 inside its /24. The .130/25 endpoint does not consider .10 inside its own /25. In a simplified setup with only those connected routes and no fallback route, the two endpoints can make different outbound path decisions. That reasoning is not proof of a packet exchange or a complete prediction for every operating-system configuration.

### Work a route-selection table — FICTIONAL

Consider these simplified entries on paper:

| Destination prefix | Intended description |
|---|---|
| 192.0.2.0/24 | A directly connected exercise network |
| 192.0.2.16/28 | A hypothetical more-specific route |
| 0.0.0.0/0 | A hypothetical default route |

For destination 192.0.2.20, the /28 covers final-octet values 16 through 31, so all three prefixes match. In this ordinary destination-prefix model, /28 wins because it is the longest match. For .10, the /28 does not match, so /24 is the most specific listed match. For an address outside both listed exercise blocks, only the default entry would match.

The last comparison is paper reasoning, not permission to send traffic to an outside address. The real exercise must not acquire the hypothetical default route or extra path. Linux policy routing and other route attributes can require more context than this simplified table; do not present it as a complete reproduction of the kernel's decision process.

### Route selection is not delivery

The existing route-get observation asks what route the local kernel would select for the named peer. It does not demonstrate that the peer is powered on, that its adapter joins the intended network, that its return path works, that filtering permits the exchange or that an HTTP listener exists.

Separate configuration evidence from behavioral evidence. An address summary describes configured addresses. A route decision describes a local forwarding choice. A permitted ping or HTTP result, collected only under its original lesson's scope, describes a particular exchange. Do not substitute one category for all the others.

If the selected source address or interface differs from the intended topology, stop practical requests. Write down the discrepancy before proposing changes. Clearing routes until a screenshot resembles the guide destroys useful diagnostic context and can alter unrelated state.

### Troubleshooting through bounded questions

| Observation | Unsupported shortcut | Better next question |
|---|---|---|
| Route-get selects an unexpected interface | Add a default gateway | Which configured interfaces and matching routes explain this selection? |
| The connected route exists but HTTP fails | The route must be wrong | What do the already-authorized listener and request observations establish? |
| Both guests display the same address | Matching means connectivity | Are identities and distinct address assignments consistent with the brief? |
| A private-looking address appears | It must be in scope | Where is that exact system authorized? |
| A route exists to another subnet | It is safe to explore | Is any action toward that subnet permitted at all? |

### Exercises and explained answers

1. Why can the intended .10/24 and .20/24 exchange avoid a default gateway? They share the configured connected network in the intended topology. That does not remove the need for correct attachment, state and controls.
2. Which fictional entry wins for .20: /24 or /28? The /28, because .20 falls in its block and it is the longer matching prefix.
3. Does the prefix authorize every address in the block? No. Address grouping and testing permission are separate facts.
4. A route decision succeeds. Has the destination application processed a request? No. The observation has not established any application exchange.
5. Why not fix an unexpected route by disabling IPv6? That changes configuration without establishing the cause and exceeds the documented read-only observation step.

Conclude with a short explanation linking guest identity, interface, source address, destination and selected path, then explicitly name what the record does not prove. Preserve genuine errors instead of filling in expected interface names.

Technical reading: RFC 4632 for CIDR and longest-match concepts. This supplement does not claim student-hardware execution or validate an exact guest configuration.
