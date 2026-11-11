# EH-LAB-03 — Build the two-VM internal practice network

Draft; the full two-VM path is not hardware-tested. Requires EH-LAB-02. Only these student-owned clean guests are in scope.

## Objective and topology
Connect NG-Learner and NG-Peer to one same-host internal virtual network called NG-FOUNDATION. Neither guest should have an exercise connection to the host, physical LAN or internet. No routing or forwarding is part of this exercise.

Oracle documents internal networking at https://docs.oracle.com/en/virtualization/virtualbox/6.0/user/network_internal.html and the current manual at https://www.virtualbox.org/manual/ . Menu names must be checked against the installed version. Internal networking is distinct from bridged, NAT and host-only modes; these are not interchangeable isolation choices.

## Prepare the second guest
Build NG-Peer from verified clean media using EH-LAB-02. Use a distinct hostname, account credentials and virtual NIC MAC address. Independent installation avoids silently copying machine identities. Do not clone a running guest or assume changing only a display name creates a distinct machine.

Before starting either guest, power both off and configure exactly one enabled adapter per guest: Internal Network, name NG-FOUNDATION. Disable every other adapter and unnecessary integration channel. Inspect both machines independently.

## Apply temporary lab addresses
Proposed exercise addresses are 192.0.2.10/24 for NG-Learner and 192.0.2.20/24 for NG-Peer. These documentation addresses are a course-local addressing choice, not a discovery target or proof of authorization. Do not assign a gateway or DNS server for this exercise.

Inside each Linux guest, run `ip -br link` and identify the intended virtual interface. The following is a template: replace IFACE with that actual interface name; do not type it blindly or operate on the host.

Learner:
```sh
sudo ip link set dev IFACE up
sudo ip address add 192.0.2.10/24 dev IFACE
```
Peer:
```sh
sudo ip link set dev IFACE up
sudo ip address add 192.0.2.20/24 dev IFACE
```
These address changes are temporary and may be altered by guest network-management software or reboot. Persistent setup needs a separate, tested distribution-specific guide. If an unexpected DHCP address or route appears, stop and resolve its source; do not flush arbitrary configuration.

## Verify more than reachability
1. Capture both hypervisor adapter configurations and guest identities.
2. Inspect `ip -br address`, `ip route` and `ip -6 route` on both guests. Explain every relevant interface and route. IPv6 link-local state is not itself evidence of external access, but unexplained default routes require investigation.
3. From NG-Learner run `ping -c 3 192.0.2.20`; from NG-Peer run `ping -c 3 192.0.2.10`. Record actual results. A failed ping can mean filtering or misconfiguration; it does not prove isolation.
4. Do not probe public addresses or the physical LAN to demonstrate isolation. Review settings, routes and forwarding/integration paths together. If the state is ambiguous, stop rather than infer safety.

## Controlled fault and recovery
Power off NG-Peer, change only its internal-network name to NG-FOUNDATION-FAULT, boot and reapply temporary addressing if needed. Repeat the bounded learner-to-peer check. Record the observation without claiming a universal result. Power off, restore the correct network name, boot, recheck addressing and repeat. Explain why matching network names matter.

For snapshot recovery, create a harmless text marker in your guest home directory, record its presence, shut down and restore the earlier baseline. Verify whether the marker and configuration match the expected snapshot state. Reapply the documented exercise configuration and recheck both guests. This tests a narrow rollback outcome, not disaster recovery or backup completeness.

## Submission
Provide a topology, configuration inventory, bounded connectivity observations, fault/recovery record and limitations. Never fabricate successful output. Do not proceed to the service exercise until both guests and the exact scope are confirmed. Report unresolved discrepancies rather than adding NAT, bridging or forwarding as a workaround.

## Teaching expansion: reason about the boundary before testing connectivity

This section supplements the existing procedure; it does not expand its permission. Use only the two clean, student-owned guests and the exact approved exercise. The fictional cases below are reasoning exercises, not records of a completed practical.

### A network is a set of permitted paths

Think of the internal network as a virtual switch connecting selected guest network cards. Matching internal-network names place those cards on the same virtual network. A matching IP prefix is not enough: two machines can both display addresses in 192.0.2.0/24 while their adapters connect to different internal networks.

Separate three questions. Attachment asks which virtual network receives each adapter. Addressing asks which addresses and prefixes the guest has assigned. Routing asks where the guest would send traffic for a destination. An answer at one layer cannot replace the others. The ordinary host application network path is excluded by the intended internal-network mode, but this is not a guarantee against a compromised host or hypervisor. The host still controls the virtual machines.

For this exercise, draw the host as the machine containing the hypervisor, not as an authorized participant on NG-FOUNDATION. Place NG-Learner and NG-Peer inside that boundary. Mark the physical LAN and internet outside the permitted exercise paths. Record integration channels separately: a shared folder is a data path even when it does not appear in the guest routing table.

A direct route to the local exercise subnet is different from a default route. The local route describes how the guest reaches addresses on that subnet through its interface. A default route is a fallback for destinations without a more specific match. This exercise does not require that fallback or DNS. The absence of a default route alone does not establish the absence of all unwanted paths; inspect the hypervisor configuration, all enabled adapters, relevant IPv4/IPv6 routes and integration channels together.

### Worked diagnosis — FICTIONAL

Both guests display their intended addresses. NG-Learner is attached to NG-FOUNDATION; NG-Peer is attached to NG-FOUNDATION-FAULT. The bounded ping does not receive replies.

The observations support a specific configuration discrepancy: the adapters are on differently named internal networks. The matching address prefix does not join those networks. The next permitted action is the documented powered-off correction of the peer's network name, followed by rechecking temporary addresses and repeating only the bounded check. Adding NAT would change the boundary rather than fix the intended experiment.

After the correction, suppose ping succeeds. Record that ICMP exchange between those two addresses was observed at that point. Do not rewrite the conclusion as “all ports work” or “the environment is completely isolated.” Neither claim follows from that check.

### Readiness record for the existing practical

Before changing state, prepare a short table with guest role, intended adapter, actual internal-network name, actual address/prefix, relevant route observations and unresolved discrepancies. Use the commands already provided above; this is not an instruction to discover additional machines. Mark an observation missing when you have not collected it. Do not populate the table with expected output.

At each stage use prediction, action, observation and interpretation. Predict what the approved change should affect. Make only that change. Record the actual result. Explain whether the result supports the prediction, and identify what remains unknown. If a result differs from the prediction, preserve it rather than repeating changes until the worksheet looks correct.

### Troubleshooting without widening scope

| Observation | Plausible explanation | Next bounded action |
|---|---|---|
| Address disappeared after reboot | The temporary configuration was not retained | Re-identify the guest interface and reapply only the documented address after checking for conflicting state |
| Both addresses look right but ping fails | Adapter attachment, link state or filtering may differ | Compare both adapter inventories and relevant guest state; do not assume the firewall is the cause |
| A default route unexpectedly appears | Another adapter or network-management configuration may exist | Stop the practical and identify the source before proceeding |
| Peer responds during the deliberately mismatched-network case | The intended fault may not have been applied, or another path may exist | Stop, verify guest identity and every adapter; do not declare the boundary sound |
| Marker remains after rollback | Snapshot selection, marker location or included storage may differ from the assumption | Record the discrepancy and compare the actual snapshot configuration without repeatedly restoring blindly |

### Recovery is a testable claim

A snapshot name is a label, not evidence of its contents. Before the harmless marker exercise, write down which guest, baseline and guest-local location you intend to test. Keep the minimal observations needed for review outside the state you are intentionally rolling back, using only approved evidence handling. Otherwise rollback can erase the record of the experiment itself.

After restoration, check the marker and relevant configuration rather than treating a successful restore dialog as proof. Guest rollback does not necessarily undo powered-off hypervisor settings or changes outside the captured guest storage. Report those boundaries explicitly. A narrow marker test does not establish recoverability from every failure.

### Review questions with explanations

1. Both guests use /24 addresses but different internal-network names. Why might they fail to communicate? The addresses describe a logical subnet, while the adapter names select different virtual network attachments. Correct attachment is still needed.
2. Ping fails. Can you claim internet isolation? No. Failure may reflect several causes and says nothing by itself about other adapters or integration paths.
3. A snapshot restore succeeds but the expected marker remains. Should you delete it and report success? No. That destroys the observation. Report the mismatch and investigate the restore assumptions.
4. Your lab only works after enabling a second NAT adapter. Is the exercise complete? No. Reachability obtained by changing the boundary does not satisfy the specified topology. Stop and report the blocker.

Technical basis: Oracle VirtualBox internal-network documentation. Menu labels and platform-specific behavior still require checking against the installed supported version.
