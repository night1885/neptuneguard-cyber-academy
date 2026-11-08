# EH-LAB-01 — Host virtualization installation

Draft for review; documentation-based, not hardware-tested or published. Requires EH-LAB-00 and actual installation/setup approval. Students own/run their labs; the academy provisions no machines. No download or installation was executed while authoring this revision.

## Outcomes and boundary
Explain host/guest separation; choose a documented installer for the actual host; distinguish required components from optional integrations; record a genuine outcome and recovery decision. End at the manager/new-VM screen without creating or booting a guest. Guest construction belongs to EH-LAB-02.

A hypervisor manages virtual CPU, memory, disks and interfaces. It does not replace host controls or grant testing permission. Installation success does not establish guest support, capacity, isolation or course readiness.

## 1. Select the route before downloading
Use Oracle's release-specific guide: https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html .

| Host | Documentation finding | Course decision still required |
|---|---|---|
| Windows x86_64 | Listed Windows 10/11 and specified Server releases | Exact OS/build, hypervisor, guest, licensing and measured profile |
| macOS Intel | Listed Intel macOS releases | Matching Intel installer and guest route |
| macOS Apple Silicon | Separate Arm host route | Actual Arm guest/toolchain, not an x86 ISO substitution |
| Windows 11 Arm | Host support labelled experimental | Explicit review, not an automatic course baseline |
| Linux x86_64 | Distribution/release-specific packages | Matching distribution, kernel, package and module/signing dependencies |

This is documentation triage, not an academy-tested matrix or a recommendation to install an out-of-support OS. Check current OS security support separately. In this VirtualBox documentation Arm hosts require Arm guests; an Arm host installer does not validate every Arm Linux image. Do not silently convert an x86 Linux route into an Arm route.

Record the proposed combination and documentation revision. If a component/toolchain is unsupported or unclear, record BLOCKED and request a reviewed route. Do not improvise emulation, import another person's VM, or purchase hardware/software.

## 2. Prepare the installation window
1. Confirm permission, capacity and support from EH-LAB-00. Save work and use the normal trusted host backup process.
2. Acquire the correct base-package installer from the publisher using the approved acquisition route. Record its version/build, architecture, source and date.
3. Apply the publisher verification/identity procedure for that exact file. Do not invent a checksum or infer identity from a logo/filename. Stop on an unexpected publisher, mismatch or unresolved warning.
4. Review network-driver changes; they can interrupt host connectivity. Do not begin during an uninterruptible work/remote session.
5. Use approved installation privileges only when necessary. Run the installed manager normally. Do not disable protections, alter broad ACLs or change firmware to force installation.

## 3A. Windows graphical route
Only for the reviewed Windows/CPU combination and verified installer.

1. Save work and open the verified installer executable.
2. Read the Welcome, directory and component choices. Prefer the reviewed/default location; do not copy recursive permission-reset commands from examples.
3. Explain each selected component. Oracle distinguishes the application, USB support, extra networking drivers and external Python API bindings. Host API bindings are not the Python interpreter needed inside the later Linux guest.
4. Keep the agreed component list. USB, extra networking and scripting integrations are not automatically required. Installing a host driver is different from selecting a guest adapter mode later.
5. Read interruption/security prompts. Stop on an unexpected identity or protection warning; this course draft does not request bypassing unsigned-driver/security controls.
6. Finish the approved installer, restart only if required, then launch VirtualBox from the Start menu normally rather than elevated. Record the installed version from its version/about interface.

## 3B. macOS graphical route
Only for the reviewed Intel/Apple Silicon combination and matching verified download.

1. Open the verified .dmg to mount it.
2. Open VirtualBox.pkg from the mounted image and review the destination.
3. Complete approved prompts only. Do not bypass management, Gatekeeper or unfamiliar security/extension prompts.
4. Open VirtualBox from Finder's Applications folder normally and record its version.
5. Keep Intel and Apple Silicon records separate. Opening the application does not make an x86 ISO compatible with an Arm host.

No privileged command-line or unattended host installation is requested here.

## 3C. Linux package/kernel route
Linux installation is not a universal one-command procedure.

1. Identify the physical host distribution/release and running kernel. `uname -r` on that authorized native host identifies its running kernel, not an approved guest image.
2. Select the exact publisher package for the reviewed distribution/architecture. Do not copy an obsolete Xenial/RPM example filename.
3. Have the approved installer/support route resolve GUI and kernel-build dependencies. Oracle documents vboxdrv and possible compiler, make and matching kernel-header requirements. If Secure Boot requires signing, use the reviewed platform signing procedure rather than disabling Secure Boot.
4. Install with the approved package manager and dependency list. Missing dependencies or an unconfigured package are blockers, not permission to add arbitrary repositories or run guessed root repair commands.
5. Open the manager through the desktop entry or `VirtualBox` as the ordinary user. Record its version. The manager can open even when the required driver/module cannot start a guest.

The selected distribution still needs exact package/dependency versions and module/signing reproduction. This draft does not pretend one command covers all Linux hosts.

## 4. Separate optional components
The base product, Extension Pack and guest-installed Guest Additions are distinct. Do not add an Extension Pack, USB group membership, shared folders or host API bindings merely because a tutorial suggests them. Each required component needs purpose, compatibility and licensing review. No guest integration or extra network permission is granted.

## 5. Demonstrate this lesson's end point
1. Open the manager/new-VM workflow and cancel without creating or starting a VM.
2. Record the installed version and whether that specific action worked.
3. Explain which choices could affect host networking or share host/guest data.
4. Record the actual result and unresolved issues. Do not submit full host screenshots, serial numbers, account details, licence keys or private files.
5. State what remains unproved: guest startup/compatibility, two-VM capacity, isolation and recovery.

## Troubleshooting and next gate
For a blocked installer, preserve a minimal non-sensitive error and request authorized support. For an unsupported architecture, request route review rather than substitution. If a Linux manager opens but driver setup failed, record the distinction. If connectivity changes, stop and use the actual publisher/support recovery process rather than changing random adapters. Missing tested profiles/private review arrangements remain blockers.

Independently explain why manager startup is weaker evidence than a reproduced isolated guest, and why host installer components are not guest tools. Proceed to EH-LAB-02 only with the reviewed guest/media/capacity and verification route, installation result and actual support process. This checkpoint grants no restricted-lab access, saved progress, XP or award.

## Sources and validation limits
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Security.html

Documentation was inspected; actual installations, measured allocations, original screenshots, licensing/support decisions and recovery remain unperformed. No platform certification or command execution is claimed.
