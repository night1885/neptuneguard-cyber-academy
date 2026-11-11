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

## Expanded teaching: trust, isolation and baseline interpretation

The sections below are original formative self-study material. Fictional cases are not execution evidence or practical permission. Answer explanations are not assessor-only marking or calibration material.

### Understand the trust chain before running the commands

The ISO is the file to be installed. The checksum file records expected digests. The detached signature authenticates the checksum file under a signing key. The signing-key identity must itself be established through the approved verification route. These are related checks, not interchangeable names for one check. Ubuntu's verification guide separates signature verification from comparing the ISO checksum.

The reasoning chain is:

established publisher key identity -> valid signature over the exact checksum file -> exact image entry in that file -> full digest match for the downloaded image.

If a link is missing, write the missing link. Do not replace it with a plausible-looking success word. A checksum match can demonstrate consistency with a supplied list while leaving the list's origin unresolved.

### Worked comparison: three different failures

Case A: the image digest matches a checksum copied from an unverified discussion post. Conclusion: consistency with that posted value, not an established publisher-authenticity decision.

Case B: the signature validates under a key whose identity has not been independently established. Conclusion: the signature/key relationship is evidence, but attribution to the intended publisher remains unresolved.

Case C: key identity and signature verification are established, but the exact image's complete digest differs. Conclusion: the selected bytes do not match the authenticated entry; do not boot the image. Use the approved acquisition recovery procedure.

None of these cases is repaired by copying sample output from documentation. The Ubuntu page includes historical example filenames and keys; these examples must not be reported as this learner's current results.

### Isolation is a configuration and evidence question

The existing route calls for every guest adapter to be disabled during offline installation, with unnecessary integrations disabled. “No website opened” is weaker evidence: a website can fail because of DNS, routing, server availability or another problem. Failure of one attempted connection does not inventory every path.

Oracle documents NAT as the default networking mode and describes its network access; it is not equivalent to disabled networking. Shared clipboard and shared folders are additional data paths that must be considered separately from adapters.

Fictional pre-boot review: adapter 1 is disabled, but adapter 2 is still configured for NAT. The VM does not match the offline plan. Do not boot and then use a failed ping as a substitute for the required settings review. Follow the approved powered-off configuration procedure and inspect all slots again.

This lesson does not introduce an active network-isolation test or authorize external probes. Later two-VM work remains in its existing place in the sequence.

### Interpret a baseline without overstating it

For each existing observation command, record the machine/context, output, immediate process status, meaning and limitation. A successful `uname -m` invocation in the guest concerns the guest kernel architecture, not proof of the physical host's identity. A successful `python3 --version` invocation demonstrates a reported version in that context, not compatibility with every later exercise.

Fictional diagnostic sequence: a tool is missing, but a subsequent printing command succeeds. Reporting only the final status would conceal the earlier failure. Keep the observation and its immediately captured status together, as the original lesson demonstrates. Missing tooling is a provisioning issue, not automatic permission to reconnect the guest.

### Snapshot existence versus recovery capability

A baseline snapshot provides a point to return toward, subject to the virtualization system's storage and state dependencies. It is not a separately stored backup simply because it appears as another item in the interface. NIST explains that storage-efficient snapshots may depend on their source data and become unusable when it is unavailable.

Scenario: the VM and its snapshots reside on the same failed physical volume. Can the learner assume the snapshot survives? No. The existence of the snapshot did not establish independent recovery from that failure.

Scenario: a snapshot restores successfully after a later software update. Is the guest necessarily current? No. Returning to earlier state can also return earlier software/configuration. Record what was restored and re-evaluate the relevant baseline through the approved process. This supplement does not move the controlled restoration exercise out of its later lesson.

### Formative exercises and explained answers

A. The installer asks for an unexpected online account. What next?
Answer: stop and resolve the approved offline/provisioning route. Do not quietly enable NAT to complete a different installation path.

B. Signature verification succeeds, but the ISO filename is for a different architecture. May it be installed?
Answer: authenticity does not establish compatibility. Resolve the exact image/host/guest route first.

C. All adapters are disabled, but a personal host folder is shared. Is the intended boundary satisfied?
Answer: no. The intended baseline also excludes unnecessary host integrations. Network configuration alone does not review the host-file path.

D. What is an honest end-of-lesson statement?
Answer: describe the genuinely performed acquisition checks, powered-off settings, local boot observations and baseline creation; list unresolved points. Do not claim a tested restore, a second VM or permission for practical testing.

### Human judgment and AI-assisted review

Optional paper-only exercise: ask an assistant to identify assumptions in a fictional setup plan containing no real addresses, personal data, credentials or host reports. Compare its answer against the exact brief and publisher documentation. The assistant is a source of hypotheses, not an authority to approve installation, change architecture or expand scope. A useful response names missing evidence; an unsafe response invents compatibility or suggests disabling controls to make the plan work. No command execution, real-system upload or external testing is part of this exercise.

### Additional reading

Canonical, How to verify your Ubuntu download: https://ubuntu.com/tutorials/how-to-verify-ubuntu . Historical examples are not a current approved route.
Oracle VirtualBox 7.2 Security Guide: https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Security.html
NIST SP 800-209, Security Guidelines for Storage Infrastructure: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-209.pdf
