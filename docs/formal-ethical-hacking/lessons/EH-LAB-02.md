# EH-LAB-02 — Prepare the offline learner workstation

Draft; no hardware reproduction claimed. Requires EH-LAB-01. This guide describes a clean Linux guest, not a weaponized image. Download and preparation are separate from the offline exercise phase. Students build their own labs; no academy machine, installation authority or practical permission is supplied by this document. Community Learning is unchanged.

## Outcomes
Verify installation media, build a clean guest without an external network adapter, create private credentials, and establish a recovery baseline.

## Your task and finish line
Build the existing NG-Learner workstation from verified clean media, with every virtual network adapter disabled. Complete the local baseline checks, identify required-tool availability, shut down cleanly and create the named baseline snapshot. Stop there: the second guest, internal-network addressing, connectivity checks and controlled restoration belong to EH-LAB-03.

Without an approved compatible host/guest route, permission and the actual course support procedure, identify the blocker instead of installing or guessing settings. This authoring draft is not itself an approved setup route. Do not purchase software, hardware or services to satisfy an unresolved draft.

## 1. Separate the two phases
| Phase | Where work happens | Boundary |
|---|---|---|
| Acquire and verify | Authorized host preparation environment | Obtain official media, signatures and any reviewed prerequisites; do not run guest checks on the host |
| Install and inspect | NG-Learner guest | All virtual network adapters disabled before first boot; no improvised NAT, bridge, host-only connection or internet test |

Host internet access for approved preparation does not authorize networking the guest. If verification tools or guest dependencies are missing, obtain a reviewed provisioning route rather than bypassing this separation.

## 2. Acquire and verify media on the host
Use a distribution's official download service and select media matching the documented guest architecture. Record distribution, release, architecture, exact ISO filename, official source and date. Do not invent a checksum or reuse one for a different image. A release name alone does not identify the exact image.

For the Ubuntu candidate route, use https://ubuntu.com/tutorials/how-to-verify-ubuntu . The publisher tutorial includes historical release/key examples; they are not a course-selected release or an instruction to trust those example identifiers for every current download. Match the actual selected release and independently establish the publisher's signing-key identity.

### Understand the three files
- ISO: the installation image you intend to boot.
- SHA256SUMS: the list associating exact image filenames with SHA-256 digests.
- SHA256SUMS.gpg: the detached signature authenticating the checksum file when verified with an independently authenticated publisher key.

A digest match against an untrusted checksum file shows agreement with that file, not publisher authenticity. A cryptographically valid signature from an unidentified key is also insufficient. Neither check proves that the OS is vulnerability-free or compatible with your hypervisor.

### Verification sequence
1. Obtain the ISO, checksum file and detached signature from the official sources for the same selected release. Keep them in the reviewed host working directory. Do not install a new shell, package manager or GPG distribution without installation approval merely because a tutorial assumes it exists.
2. Establish the correct signing key and compare its full fingerprint with the publisher's authoritative verification information. An email-style key label, a short ID or a key obtained solely because an untrusted signature requests it does not independently establish identity. Fetching a key is a host preparation action, not a reason to connect the guest.
3. In the approved host command environment with GnuPG available, verify the detached signature over the checksum file:

```sh
gpg --keyid-format long --verify SHA256SUMS.gpg SHA256SUMS
```

The two filenames are inputs; this is not an installer. GnuPG can create local keyring/trust state as part of its use. Record the actual result and signer identity without copying unrelated keyring data. Missing keys, a BAD signature, unresolved key identity or another verification failure block use of the image. A trust warning needs explanation against the authenticated fingerprint; do not simply ignore it or mark an unknown key trusted to silence it.

4. Only after authenticating SHA256SUMS, calculate the digest of the exact local ISO. In an approved host environment with sha256sum, the following is a filename template, not a ready-to-paste command:

```text
sha256sum -- './REPLACE-WITH-SELECTED-IMAGE.iso'
```

Replace the placeholder with the reviewed local filename. Compare the complete computed digest with the authenticated entry for that exact image. This reads the ISO; it does not boot it. A host lacking this command needs its reviewed platform-specific verification route, not an improvised download of a similarly named utility.

5. Record signature/key-identity verification and ISO-digest comparison as separate results. Do not filter output down to a convenient OK line and discard errors about the selected image. A mismatch, absent image entry or uncompleted trust check means stop: do not boot the image while investigating through the approved support route. Do not edit SHA256SUMS to make a mismatch pass.

These are teaching commands, not executed results. Do not copy a tutorial's sample timestamps, filenames or successful output into your evidence.

## 3. Create the guest — remain powered off until checked
Oracle documents the candidate GUI workflow at https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/create-vm.html . Use the documentation matching the installed version; labels and architecture options can differ. The consulted guide can enable unattended installation by default, and newly created VMs can have a default NAT adapter. Neither default satisfies this lesson's reviewed manual offline route.

1. In the hypervisor's new-VM workflow, name the guest NG-Learner. Select the verified ISO and matching guest OS/architecture; inspect any automatically detected fields rather than assuming they are correct.
2. Choose the manual-installation route. In the consulted 7.2 workflow, deselect Install OS Using Unattended Installation. Do not start background or unattended provisioning that bypasses the pre-boot review.
3. Select the VM folder, CPU, memory and new virtual-disk allocation using the validated course route. Leave enough host resources for normal operation, the second VM and recovery data. Record actual values; this draft supplies no universal allocation or approved firmware/EFI combination. Do not use a raw host disk, an existing unrelated disk or physical-device passthrough as an installation target.
4. Complete VM definition without starting the guest. Before first boot, open its settings while powered off. Inspect every virtual network adapter and disable them all. A disconnected cable icon or an assumed default is not a substitute for checking the configuration. If you cannot inspect the complete configuration, stop before booting.
5. Disable shared clipboard, drag-and-drop, shared folders and unnecessary device passthrough. Do not expose host personal directories as an easy file-transfer route. No optional integration installation is required by this step.
6. Confirm the intended ISO is attached to the virtual optical drive and the new virtual disk is the intended destination. Record the pre-boot checks without including personal host paths or identifiers. Only then start the reviewed offline installation.

## 4. Install without guest networking
1. Use local installation options that do not require downloads. Verify that the installer is running inside the NG-Learner VM window. Confirm that disk-selection or erasure prompts refer only to the intended VM virtual disk. Stop if the destination is uncertain; do not treat a destructive prompt as a routine Next button.
2. Create a unique local account and password. Do not reuse institutional credentials, paste secrets into evidence or provide credentials to an unattended-installation example. Use the actual course's credential-handling guidance where applicable.
3. If required software cannot be installed from the verified media without downloads, record the dependency and stop for a reviewed provisioning route. Do not attach NAT, bridge to the physical LAN or add another adapter to finish.
4. Complete installation and shut down cleanly using the guest OS. Saving execution state, pausing and abruptly powering off are not interchangeable with an orderly shutdown. If the guest will not shut down normally, use approved troubleshooting rather than pretending a clean baseline was obtained.
5. While the VM is powered off, detach the installation ISO and recheck the disabled adapters and integration settings. Boot from the virtual disk, verify local login and then run the guest-only checks below. If the installer starts again, inspect the ISO/boot configuration rather than reinstalling blindly.

## 5. Local baseline checks — run inside NG-Learner
Open a terminal inside the Linux guest, not a similarly named host terminal. Use one command at a time and record actual output or an explicit blocker. The following selected forms inspect local information or print versions; none requests a remote URL, changes an address or authorizes a connectivity test.

```sh
cat /etc/os-release
uname -m
ip -br address
ip route
ip -6 route
python3 --version
curl --version
```

| Command | What to explain | Limit |
|---|---|---|
| cat /etc/os-release | Distribution/version fields read from the guest's OS metadata | Not a security evaluation or host inventory |
| uname -m | Reported machine architecture of the running guest | Not proof of every intended application's compatibility |
| ip -br address | Brief interface state and assigned addresses | Addresses alone do not establish isolation |
| ip route | Displayed IPv4 routing information | Not the IPv6 view or an exhaustive audit of every routing/policy path |
| ip -6 route | Displayed IPv6 routing information | An unexplained route still requires investigation; absence alone is not complete isolation proof |
| python3 --version | Whether the selected guest Python command reports a version | Not the host VirtualBox Python API binding or proof that later scripts pass |
| curl --version | Whether the guest client reports a version and build capabilities | No HTTP request was sent by this version check; it does not prove a service works |

With every adapter disabled, do not expect a usable external network. Loopback is not a separate physical-network connection. Compare guest observations with the powered-off hypervisor settings; do not infer isolation from a failed request or a blank route display. If an unexplained interface, address or route appears, stop and report the discrepancy. Do not flush routes or probe public/home-network targets to make the evidence look correct.

Missing python3, curl or baseline inspection tools are provisioning blockers. Preserve the specific failure rather than substitute another tool silently. A reviewed offline dependency/transfer route must resolve them before later work; do not reconnect the guest ad hoc. An offline guest is not automatically patched or safe. Any update/maintenance phase requires its own reviewed procedure and a return-to-isolation check.

## 6. Establish the recovery baseline
1. Complete the local observations and resolve mandatory setup dependencies through the approved route. Do not label an unfinished installation ready.
2. Shut down cleanly and confirm the hypervisor shows Powered Off rather than Saved.
3. Select NG-Learner, open its Snapshots view and choose Take using the installed version's documented controls. Give the baseline a meaningful name and description stating the media/release, configuration and tool availability actually observed. Do not put passwords in the snapshot description.
4. Record the actual snapshot name and its presence in the snapshot view. If snapshot creation fails, record that failure; a proposed name is not a created snapshot.

A snapshot supports rollback but is not a substitute for a separate backup of important data. Restoring it also restores old configuration and software state and can discard later changes. Creating it does not prove restoration works. Do not restore, delete snapshots or run a fault drill here; the controlled recovery exercise remains in EH-LAB-03. Oracle's snapshots and VM-setting guidance is at https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/working-with-vms.html .

## 7. Evidence and assessment
Provide the existing evidence items through the approved private route only when collection, access and retention rules exist. No real learner collection is authorized by this draft. Minimal text is acceptable; screenshots are not mandatory.

| Existing evidence item | What must be distinguishable |
|---|---|
| Image provenance and verification | Exact selected media, authenticated checksum source/key identity, actual signature result and actual image comparison |
| Guest inventory | Observed OS/architecture and actual resource choices, not assumed compatibility |
| Adapter/integration settings | Every adapter disabled before boot; no unreviewed sharing or passthrough |
| Local baseline observations | Each command's result or blocker, separated from its interpretation |
| Tool availability | Observed python3 and curl results versus unresolved provisioning |
| Baseline name | An actually created snapshot versus an untested plan; no restoration claim |

Explain the difference between integrity and authenticity, why all adapters were inspected, and what remains unverified. For feedback, the reviewer should identify the exact missing check or unsupported inference and request a targeted correction. Do not ask a learner to bypass a blocker to obtain a successful-looking screenshot. Reading, a digest match or a snapshot name does not automatically earn a grade, authorize a lab or establish readiness.

Do not submit private keys, credentials, full keyring listings, host personal paths or unrelated diagnostic bundles. Label fictional predictions as predictions and actual observations as observations; never invent output. Proceed only after the course's actual reviewer can identify a complete compatible setup with no unresolved mandatory dependency.

## Authoring and release boundary
This expansion retains EH-LAB-01 as the prerequisite and EH-LAB-03 as the next practical boundary. It adds no canonical lesson ID, prerequisite edge, external target, networking permission, publication flag, runtime integration, Discord handler, database change or deployment.

Documentary sources were consulted 2026-11-02. No ISO download, signing-key retrieval, GPG verification, digest comparison, VM creation, guest installation, local guest command, snapshot creation/restoration or hardware reproduction was executed for this batch. These are source-supported teaching steps, not a validated host/guest route, independent assessor calibration or learner-release approval.
