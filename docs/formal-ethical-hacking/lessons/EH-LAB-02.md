# EH-LAB-02 — Prepare the offline learner workstation

Draft; documentation-based, no hardware reproduction claimed. Requires EH-LAB-01 and an approved exact guest/media/toolchain route. This is a clean Linux guest, not a weaponized image. Host acquisition, guest installation and the later offline exercise are separate phases.

## Outcomes
Explain authenticity versus integrity; define a guest without an external adapter; keep credentials private; record genuine baseline observations; establish a recovery point without claiming restoration was tested.

## 1. Acquire the exact media on the host
Use the approved publisher source and image for the reviewed release/architecture. Record the actual filename/source/date. A generic Linux label does not establish compatibility; do not substitute an x86 image on an Arm host.

For an Ubuntu candidate, obtain the ISO, SHA256SUMS and SHA256SUMS.gpg for the same release through approved official sources. Keep them in a dedicated acquisition directory. Do not mix releases or replace missing verification files with forum values.

Official procedure: https://ubuntu.com/tutorials/how-to-verify-ubuntu . Its old example filenames, key IDs and platform installation examples are not this course's current tested route. The selected route must specify an already approved verification toolchain and an independently verified current publisher signing-key fingerprint. A key-server response or signature name alone is insufficient.

## 2. Follow the trust chain
The signature concerns the checksum file; its authenticated checksum entry then concerns the exact ISO bytes. Matching an untrusted digest list does not authenticate a publisher. Verification under an unverified key does not establish who owns that key.

On an approved GNU/Linux acquisition host with an already provisioned GnuPG/coreutils toolchain:

```sh
gpg --keyid-format long --verify SHA256SUMS.gpg SHA256SUMS
signature_status=$?
printf 'Signature process exit: %s\n' "$signature_status"
```

Use only the approved acquisition directory. GnuPG may create/use keyring or trust-database state; this is not a read-only host claim. No improvised software installation or key retrieval/import is requested.

Stop on failure, unclear release/file identity or an independently unestablished key/fingerprint. Status zero is evidence of the invocation's reported success, not the entire authenticity decision. Do not copy historical key IDs or sample success output as your result.

Only after the trust decision, compute the approved ISO's hash on that same reviewed GNU/Linux toolchain:

```sh
printf 'Exact approved ISO filename: '
IFS= read -r iso_name
sha256sum -- "$iso_name"
iso_hash_status=$?
printf 'Hash process exit: %s\n' "$iso_hash_status"
```

Enter the approved image basename, not a personal file, stdin marker or command. The quoted variable is a filename argument, not eval. Compare the entire digest with the authenticated entry for that exact image. Stop on mismatch, missing entry, command failure or uncertainty. Do not filter for a successful-looking word.

These blocks are not Windows/macOS verification routes, fresh-key provisioning or execution evidence. Other acquisition hosts need reviewed equivalents; do not reconnect the exercise guest to solve host tooling gaps.

## 3. Create a definition without silently starting installation
For the reviewed VirtualBox 7.2 GUI, choose Home then New. If the wizard is not shown, use the documented Basic experience rather than guessing another workflow.

1. Name the VM NG-Learner. Choose a reviewed VM-file volume/location with space for disks and recovery. Do not choose a raw physical disk.
2. Select the verified ISO. Confirm detected OS/architecture against the route; autodetection is a hint, not validation.
3. Where offered, deselect Install OS Using Unattended Installation. This manual route does not request background installation or credential entry before settings review. Oracle documents unattended installation as unavailable on Arm hosts.
4. Select CPU, memory and virtual-disk values from the reviewed profile. Explain what remains for the host and second peer; defaults are not measured course minima.
5. Finish only if the VM remains powered off for review. If that version auto-starts or cannot provide the review point, stop for its exact route instructions.

## 4. Inspect every setting before boot
Open Settings with the VM powered off.

- Inspect every adapter slot/tab, not only adapter 1. Disable all adapters for offline installation. A default NAT adapter left enabled is not disabled networking.
- Disable shared clipboard, drag-and-drop, shared folders and unnecessary passthrough. Do not attach personal storage or enable integrations as convenience fixes.
- Confirm storage is the intended new virtual disk and verified ISO. Record only necessary private evidence, not a host directory listing.
- Match boot settings to the reviewed guest. Do not toggle firmware/security/acceleration blindly.

Recheck after wizard, import or restore changes. A private address or failed ping is not proof these paths are absent. Two-VM networking belongs to EH-LAB-03; no NAT, bridged or host-only attachment is introduced now.

## 5. Install and perform the first offline boot
1. Boot only after review. Confirm you are operating the VM installer and selecting its virtual disk, not a host/physical disk. Stop if uncertain.
2. Follow the reviewed local/offline route. Create unique local credentials; do not reuse institutional accounts or put secrets in notes/command arguments for evidence.
3. Unexpected download/account/package requirements are provisioning blockers. Do not quietly attach an external adapter.
4. Complete the reviewed installer and shut down cleanly. Detach the ISO through powered-off storage controls, then boot the virtual disk.
5. Verify local login. Record an actual failure and use approved recovery rather than substituting expected output.

## 6. Record a minimal baseline without a circular prerequisite
Confirm the terminal is in the authorized Linux guest. Run one observation at a time and immediately record its status. For example:

```sh
cat /etc/os-release
printf 'os-release exit: %s\n' "$?"
```

Here "$?" is expanded for the immediately preceding observation before printf runs. Do not perform another command first, and do not treat printf's own success as proof of earlier observations.

Repeat that two-line pattern with one command from this table at a time. Keep each output and status separate; stop for missing tools or unexplained errors before further practical work.

| Observation | What it helps establish |
|---|---|
| `uname -m` | Guest kernel architecture, not physical-host identity |
| `ip -br address` | Interface/address summary, not complete isolation |
| `ip route` | IPv4 routes in this context |
| `ip -6 route` | IPv6 routes, reviewed separately |
| `python3 --version` | Availability/reported Python version |
| `curl --version` | Availability/reported curl build |

Do not paste all observations as a group and record only the last status. EH-LINUX-03 later develops output/exit-status reasoning in depth; it is not an additional prerequisite for this setup step.

Expect no usable external connection with adapters disabled. Missing observation commands, Python or curl are provisioning blockers, not permission to reconnect or install guessed packages. Any maintenance/transfer phase needs review and a return-to-isolation check. Offline does not mean patched or proven safe.

## 7. Establish a baseline, not a restoration claim
Shut down cleanly and create the route's named baseline snapshot. Record its actual software/configuration; back up important host data separately. Restoring a baseline restores old configuration/software too. Snapshot existence is not proof of recovery. EH-LAB-03 retains the controlled recovery/two-VM work. No new peer, scan, external target or HTTP request is authorized here.

## Review, explanation and next gate
Prepare approved minimal/redacted evidence: exact image/release; trust decision and genuine verification result where executed; guest identity/OS/architecture; pre-boot adapter/integration settings; actual allocations; tool availability; baseline name; unresolved problems. Exclude credentials, private keys, serial numbers and full machine bundles.

Explain signature/key identity versus digest consistency, why every adapter was inspected, why unattended installation was not used silently, and what remains unperformed. The stated expectations are draft review criteria, not numeric pass marks. Assessor-only notes/calibration remain separate from learner delivery.

Consider EH-LAB-03 only after actual setup, compatibility, dependencies and support/private evidence handling are reviewed. Page completion does not issue enrolment, assignment, exercise permission, progress or certification.

## Sources and actual limits
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/create-vm.html
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Security.html
https://ubuntu.com/tutorials/how-to-verify-ubuntu

No ISO download, signing-key authentication, GnuPG/hash invocation, host installation, guest boot, isolation check or snapshot restore was executed while authoring. These are instructions awaiting exact-route reproduction, not fabricated evidence.
