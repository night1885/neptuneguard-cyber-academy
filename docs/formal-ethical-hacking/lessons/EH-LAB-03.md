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
