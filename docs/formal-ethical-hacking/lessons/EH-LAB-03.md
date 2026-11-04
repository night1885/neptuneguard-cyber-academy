# EH-LAB-03 — Build the two-VM internal practice network

Draft; the full two-VM path is not hardware-tested. Requires EH-LAB-02. Only these student-owned clean guests are in scope. This document supplies neither a validated host/guest configuration nor actual lab authorization. Community Learning is unchanged.

## Objective and finish line
Connect NG-Learner and NG-Peer to one same-host internal virtual network called NG-FOUNDATION. Neither guest should have an exercise connection to the host, physical LAN or internet. No routing, forwarding, DNS setup, DHCP server, scanning or service installation is part of this exercise.

Complete the existing topology/configuration record, bounded two-way connectivity observations, single network-name fault and restoration, and harmless-marker snapshot recovery. Finish by explaining what each observation establishes and what it does not. HTTP service work remains in EH-LAB-04. Without the actual approved scope, compatible setup, required tools or support procedure, record the blocker instead of proceeding.

## 1. Understand the topology before configuring it
```text
Student-owned host running the hypervisor
  NG-Learner -- one Internal Network adapter --+
                                              +-- NG-FOUNDATION
  NG-Peer    -- one Internal Network adapter --+

No exercise link from either guest to the host network, LAN or internet.
All other guest adapters and unnecessary integration channels disabled.
```

This is a model to verify, not evidence that a VM is isolated. Internal networking links participating virtual adapters by the internal-network name. A guest attached to a different name is not on this same virtual switch merely because its IP address looks similar. A shared network name also does not authorize unrelated VMs: review the known local configuration and stop if unapproved participants or paths are present; do not discover them by scanning.

| Choice or tool | Role here | Important limit |
|---|---|---|
| Internal Network | Connect the two reviewed guests on the same host through NG-FOUNDATION | Does not replace checks of other adapters, guest configuration and integration paths |
| NAT, bridged or host-only mode | Not the selected exercise mode | Do not substitute one to make a failed check succeed |
| ip inspection commands | Explain the selected guest's links, addresses and displayed routes | A single display is not an exhaustive isolation audit |
| sudo ip configuration commands | Bring up the selected guest interface and add its temporary exercise address | These change guest state; they are not read-only checks or host commands |
| ping -c 3 | Observe the specified peer using three requested echo probes | A response is limited reachability evidence, not service availability, authorization or isolation proof |
| Snapshot Restore | Revert the selected guest to its recorded baseline | Can discard later files and revert settings; not a backup or universal recovery test |

Documentary references consulted 2026-11-02:
- Oracle internal-network explanation: https://docs.oracle.com/en/virtualization/virtualbox/6.0/user/network_internal.html . This is a historical-version conceptual reference, not a claim that its menu labels match the installed release.
- Oracle 7.2 VM settings and snapshot guidance: https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/working-with-vms.html . Use the documentation matching the actual installed version.
- Linux address-management semantics: https://man7.org/linux/man-pages/man8/ip-address.8.html . Documentation examples do not expand the exercise targets.

## 2. Prepare the second guest independently
Build NG-Peer from verified clean media using EH-LAB-02, initially with all adapters disabled. Use a distinct hostname, account credentials and virtual NIC MAC address. The hypervisor display name, guest hostname and interface identity are different things; record how you distinguish the two guests without revealing passwords.

Independent installation avoids silently copying machine identities. Do not clone a running guest or assume changing only a display name creates a distinct machine. If identities or prerequisites are unresolved, stop before networking. Do not borrow an unrelated appliance or internet machine as the peer.

Preserve each guest's documented offline baseline and minimal setup record. Confirm that no unrelated work would be lost by this lesson's already planned snapshot exercise. A snapshot name alone is not proof that its contents match the intended baseline.

## 3. Configure the virtual adapters while powered off
1. Shut down both guests cleanly. Confirm Powered Off rather than Running, Paused or Saved before changing the reviewed settings. Abruptly cutting power is not the normal shutdown procedure.
2. Select NG-Learner in the hypervisor, open Settings and its network configuration. Enable exactly one adapter and select Internal Network using the installed version's documented controls. Enter NG-FOUNDATION exactly.
3. Inspect every other adapter and disable it. Keep shared folders, shared clipboard, drag-and-drop and unnecessary passthrough disabled. Do not add forwarding, a host network connection or a second adapter.
4. Repeat the inspection independently for NG-Peer. Confirm its one enabled adapter also uses Internal Network and exactly NG-FOUNDATION, with a virtual MAC address distinct from NG-Learner's. Record only relevant virtual-device information, not the host's personal inventory.
5. Review both configurations side by side before booting. Resolve an unexpected extra adapter, mode, network name or integration path before sending any probe. A status icon alone is not the complete check.

## 4. Identify each guest interface before changing addresses
Start the two reviewed guests. Open a terminal inside each guest, not on the host. Run the existing local inspection commands first:

```sh
ip -br link
ip -br address
ip route
ip -6 route
```

Use ip -br link and the reviewed virtual-adapter identity to identify the intended interface in each guest. IFACE below is a placeholder for that guest's actual interface name, not a shell variable already configured for you. Do not select loopback, guess a familiar interface name or assume both guests use the same name. If you cannot match the interface to the reviewed virtual adapter, stop.

Inspect current addresses before adding one. If the required exercise address already exists on the correct interface with the correct prefix, record it rather than repeatedly adding it. Unexpected DHCP addresses, routes, interfaces or a conflicting configuration are blockers; do not flush configuration or disable network-management software wholesale. A distribution-specific management conflict needs reviewed troubleshooting.

## 5. Apply only the existing temporary lab addresses
| Guest | Exercise address | Gateway/DNS |
|---|---|---|
| NG-Learner | 192.0.2.10/24 | Do not assign either |
| NG-Peer | 192.0.2.20/24 | Do not assign either |

These documentation addresses are a course-local addressing choice, not a discovery range or proof of authorization. The /24 prefix places the two selected addresses in the same proposed IPv4 subnet. That does not override the virtual-switch configuration or grant permission to contact other addresses.

The following are templates. Replace IFACE separately in each guest only after identifying its actual interface. These commands require approved guest administrative privileges and change its live configuration. Do not run them on the host.

NG-Learner:
```sh
sudo ip link set dev IFACE up
sudo ip address add 192.0.2.10/24 dev IFACE
```

NG-Peer:
```sh
sudo ip link set dev IFACE up
sudo ip address add 192.0.2.20/24 dev IFACE
```

The link command enables the selected interface administratively. The address command adds the selected address/prefix; it does not identify the correct interface for you or remove unrelated state. Stop on an error and explain it rather than repeatedly using elevated commands until something changes.

These changes are temporary and may be altered by guest network-management software, reboot or restoration. Persistent setup still requires a separately tested distribution-specific guide. No gateway or DNS server is needed for these specified same-subnet literal-address checks. Do not add one as a connectivity workaround.

## 6. Verify configuration before reachability
1. Re-run ip -br address, ip route and ip -6 route inside both guests. Match each selected address to the intended interface and explain the relevant displayed routes. Normal connected-subnet routing information is not an instruction to add a default gateway.
2. Explain any IPv6 state separately. A link-local address alone is not evidence of external access, but an unexplained default route or extra path requires investigation. Do not disable IPv6 blindly to hide a discrepancy.
3. Compare the guest observations with the hypervisor adapter and integration records. A blank route display is not complete isolation evidence; these selected displays do not audit every possible policy or forwarding path.
4. Only after the configuration and authorization agree, run the existing bounded peer checks below. If the state is ambiguous, stop. Do not probe a public address, physical LAN device, host address or alternative guest to prove isolation.

From NG-Learner only:
```sh
ping -c 3 192.0.2.20
```

From NG-Peer only:
```sh
ping -c 3 192.0.2.10
```

The -c 3 option limits the requested echo-probe count; it is not permission for a subnet sweep or an unbounded repeat loop. Record actual transmitted/received observations and the reported result rather than replacing them with expected success. Reply, loss and an error are different observations. A failed ping can reflect filtering or misconfiguration; it does not prove isolation. A successful ping does not demonstrate that an HTTP service exists. Do not disable the guest firewall wholesale to force a reply.

## 7. Controlled network-name fault — change one variable
Use the same existing fault NG-FOUNDATION-FAULT. Do not turn the fault into NAT, bridging, an added adapter, routing or a security-control bypass. Establish the working baseline above first; without it, a later failure cannot be confidently attributed to the intended change.

1. Record the pre-fault configuration and the learner-to-peer result. Predict what changing only the peer's internal-network name should affect. Label this as a prediction.
2. Shut down NG-Peer cleanly, confirm Powered Off and change only its internal-network name from NG-FOUNDATION to NG-FOUNDATION-FAULT. Keep the adapter in Internal Network mode and all other settings within scope.
3. Boot NG-Peer, inspect its interface/address/routes and reapply the documented temporary address only if necessary and unambiguous. Record any additional state change rather than concealing it as part of the intended fault.
4. From NG-Learner, repeat only ping -c 3 192.0.2.20. Record the actual result. If the peer still replies, do not declare the control passed: stop and investigate the recorded topology/identity through the approved support process without expanding probing.
5. Shut down NG-Peer cleanly, restore only the name NG-FOUNDATION, boot and verify its temporary addressing and the reviewed settings again. Repeat the same bounded learner-to-peer check.
6. Compare baseline, fault and restored observations. A meaningful contrast needs the original positive control, the actual fault result and the restored control. If restoration does not recover the baseline, report an unresolved exercise rather than adding a workaround.

## 8. Controlled snapshot recovery — test the earlier baseline
Restoration can discard all guest changes since the selected baseline, not just a marker. Preserve the minimal permitted exercise record through the approved evidence process before restoring. If unrelated work or required evidence would be lost, stop and obtain the approved recovery plan. Do not upload personal data or enable sharing to make a quick copy.

1. Use NG-Learner for this narrow marker check. Identify its earlier offline baseline from EH-LAB-02 and review the recorded settings/content. Confirm the baseline predates the proposed marker. Do not select the peer's snapshot or an unrelated snapshot because its name looks similar.
2. In NG-Learner's own home directory, check that ng-lab03-marker.txt is absent. If it already exists, stop and resolve that collision rather than overwrite it. Using a local text editor, create that harmless file with the text NG-LAB-03 disposable rollback marker. Save and reopen it locally to record its presence. Do not use a shared folder, host directory or secret as the marker.
3. Predict whether the marker should exist after restoring the earlier baseline, and which network settings may revert. Record the prediction separately from the actual result.
4. Shut down both guests cleanly. In the hypervisor, select NG-Learner's Snapshots view, select the confirmed earlier baseline and use Restore according to the installed version's documentation and approved course procedure. Review the selected guest, snapshot and destructive-change prompt before confirming. If you cannot safely discard the current state, remain stopped; do not click through an unfamiliar prompt.
5. Before booting, inspect the restored VM settings. The EH-LAB-02 baseline should have every adapter disabled; verify rather than assume this. Do not boot a restored unexpected external adapter. Boot only after the restored configuration matches the reviewed offline baseline.
6. Log in locally, inspect the marker's actual presence/absence and compare the OS/tool/configuration observations with the recorded baseline. An absent marker alone does not prove a complete restore. If the marker is present or settings differ unexpectedly, record the discrepancy and stop for review.
7. Shut down cleanly and reapply the documented NG-FOUNDATION configuration to the reviewed guests using the preceding steps. Inspect both machines independently, boot, identify their interfaces and restore only the documented temporary addressing if needed. Recheck both guests' addresses/routes and the same two bounded peer pings. Do not assume the pre-restore network survived.

This demonstrates only the observed marker/configuration rollback and subsequent network re-establishment. It does not prove host backup completeness, disaster recovery, malware removal, application consistency or reliable recovery from every failure. No snapshot deletion or additional fault is required.

## 9. Submission, feedback and next-lesson gate
Provide the existing topology, configuration inventory, bounded connectivity observations, fault/recovery record and limitations. Use the approved private route only when access/collection/retention rules exist; this draft authorizes no real learner collection. Relevant redacted text is acceptable; screenshots are not mandatory.

| Existing evidence | Explain clearly |
|---|---|
| Topology and inventory | Which exact two guests, adapter identities, internal-network names and addresses were used |
| Configuration review | What was observed in both hypervisor settings and guest displays; what remains unverified |
| Connectivity | Actual two-way bounded observations, not an invented successful transcript |
| Fault and restoration | Baseline result, one intended change, fault result, restored settings and actual restored result |
| Snapshot exercise | Selected earlier baseline, marker prediction/presence, actual rollback result and post-restore adapter/address checks |
| Limits and final state | Unresolved dependencies, actual final state and which temporary settings may need rechecking after reboot |

Feedback should identify the precise missing observation or unsupported inference and request a targeted correction. A learner who honestly reports an unresolved fault has not supplied a successful restoration, but must not be pushed to bypass isolation to obtain one. Keep predictions, guided corrections and independent observations distinguishable. Do not invent timestamps, outputs, peer identities or completed recovery claims.

Do not proceed to EH-LAB-04 until both guests, the exact scope and mandatory setup requirements are confirmed through the actual reviewer process. If either guest is shut down or restored again, recheck temporary configuration before later practical work. This document grants no automatic grade, permission or award.

## Authoring and release boundary
This is an expansion of the existing EH-LAB-03, not a new exercise. It preserves the two named guests, NG-FOUNDATION and its existing named fault, 192.0.2.10/24 and 192.0.2.20/24, the existing bounded ping checks, and the harmless-marker recovery task. No new canonical lesson, prerequisite edge, external target, runtime integration, publication flag, database change, Discord interaction or deployment is introduced.

No guest provisioning, adapter change, privileged address command, ping, marker creation, snapshot restore, hardware reproduction, full repository suite or assessor calibration was executed for this authoring batch. Publisher documentation explains the mechanisms; it does not establish that a student-built route has been validated or the course is ready for release.
