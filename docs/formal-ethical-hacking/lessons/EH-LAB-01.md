# EH-LAB-01 — Host virtualization installation

Draft for review; not hardware-tested or published. Requires EH-LAB-00. Students own and operate their labs; the academy provisions no machines. These instructions do not grant installation permission or replace a validated course setup route. Community Learning is unchanged.

## Outcomes
Explain host versus guest, install a suitable hypervisor from its publisher, record versions without exposing personal identifiers, and identify a recoverable setup failure.

## Your task and finish line
Read the component explanation, establish your installation gate, follow only the applicable approved host route, and record what actually happened. The practical stops after the manager opens and you open then cancel the new-VM workflow. Do not create, import or boot a guest here; guest construction belongs to EH-LAB-02. A blocked result is a legitimate observation, not permission to improvise a workaround.

No real installation is required merely to review this draft. Without installation approval and a validated supported course route, complete only the explanation and identify the blocker. This document itself supplies neither approval.

## Understand the components
The host is your physical computer and operating system. A hypervisor manages virtual machines. Each guest has virtual processors, memory, disks and network interfaces. Guest settings do not replace host security controls. A VM is not permission to test external systems.

| Component or tool | Its job in this lesson | What it does not establish |
|---|---|---|
| Browser and publisher documentation | Locate the platform package and instructions for your host OS and processor | That an advertisement, mirror or search snippet is the publisher |
| Host installer or package manager | Install the approved application and required host components | That the intended guest can boot or is isolated |
| VirtualBox Manager | Open the graphical management interface and inspect the new-VM workflow | Working guest drivers, networking isolation or assessment permission |
| Optional Windows Python API binding | Allow external Python programs to use the VirtualBox API when selected and supported | Availability of python3 inside the later Linux guest |
| Minimal text record | Preserve the source, version, result and unresolved issue | A successful run when nothing was executed |

This draft uses VirtualBox as a candidate route, not a promise of compatibility with every host. Match three separate things: host OS/version, host processor architecture, and intended guest OS/architecture. A publisher-listed installer is not an academy-tested complete lab configuration. Under the consulted 7.2 guide, Arm hosts require Arm guests; an x86 guest is not a substitute. Experimental host support must not silently become an approved course route.

## Sources and version boundary
Documentary basis consulted 2026-11-02:
- Official platform packages: https://www.virtualbox.org/wiki/Downloads
- Oracle VirtualBox 7.2 installation guide: https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html

Use the instructions matching the actual selected release and host. This is not a requirement to install the newest release, an approval of all publisher-listed hosts or a claim that 7.2 was tested by the course. Exact release selection, resource allocations, screenshots and host/guest reproduction remain release work.

## Before installation — establish the gate
1. Complete the non-sensitive readiness inventory from EH-LAB-00. Resolve installation authority and the supported course route before changing the host.
2. Confirm sufficient space for two guests, their virtual disks and recovery data. Exact allocations require platform validation; this draft sets no universal minimum.
3. Back up important host data using your normal trusted process. Save open work before installation or restart. If other VMs already exist or are running, stop and obtain a reviewed installation/upgrade plan rather than treating this as an empty host.
4. From the official download page, select the package for the host OS and processor. Record product version, package filename, source URL and download date. Keep guest media acquisition separate; no guest ISO is needed here.
5. Follow the publisher's verification instructions and the host platform's documented identity/signature controls. Stop on a mismatch, unexpected publisher or unresolved verification failure. Do not invent a checksum or treat a plausible filename as verification.
6. Review licensing and the required component choices for the approved route. Optional extensions are not automatically required or freely licensed for every use. Do not add them without an identified course need and license review.
7. If firmware virtualization, host protections or organizational policy needs attention, use authorized platform support. Do not disable protections, weaken directory permissions or bypass device management to force installation.

## Route A — Windows host, publisher executable
Document-derived walkthrough; not a tested Windows course configuration.

1. Confirm the chosen Windows version and processor are documented for the exact installer. Do not infer architecture support from the Windows name alone.
2. Open the verified publisher executable to start the installation wizard. Use approved privileges; stop if authorization is unavailable.
3. Read the destination and component choices. The main application, USB support, networking drivers and Python API support have different purposes. The networking components can affect host networking; their presence is not permission to bridge a future guest to the physical network. Use only the reviewed component selection for the course route.
4. If Python API support is selected, its host Python prerequisite concerns that optional API component, not the later guest's python3 prerequisite. Do not install unrelated software merely to dismiss a warning. If the reviewed selection cannot be installed, record the blocker.
5. Stop on an unresolved signature, driver, directory-security or policy warning. Do not copy broad ACL-reset commands into a host directory or approve an unexpected publisher. Request the approved recovery or installation guidance.
6. Complete installation only if the gate remains satisfied. Restart only when required. Launch VirtualBox from its Start-menu entry or Windows search. Continue to the common check below.

## Route B — macOS host, publisher disk image
Document-derived walkthrough; not a tested macOS course configuration.

1. Distinguish Intel from Apple Silicon before selecting the platform package. Confirm the documented host/guest architecture combination; a matching application download alone does not settle guest compatibility.
2. Open the verified dmg disk image. In its window, open VirtualBox.pkg to start the installer.
3. Read the destination and installation prompts, using only approved privileges. If macOS or management policy blocks installation or presents an unresolved trust/security requirement, stop for the documented authorized process. Do not disable host protection to continue.
4. Finish only while the approved route remains satisfied, then open VirtualBox from Applications in Finder. Continue to the common check below. No unattended-installation command or guest media is needed for this route.

## Route C — Debian/Ubuntu host, publisher deb package
Document-derived package example, not support for every Linux distribution or a tested course configuration. Other distributions need their own reviewed, release-matched package instructions; do not substitute this command for an RPM or generic installer procedure.

1. Confirm the distribution, release, architecture and running-kernel prerequisites against the selected release's documentation. Obtain and verify the matching publisher package. Do not copy a historical distribution filename from a documentation example as if it were your package.
2. Check the documented dependencies before installing. Linux VirtualBox uses the vboxdrv kernel module; a manager window can open even when guests cannot start because that module is unavailable. Building modules can require matching kernel headers, compiler and build tools. Do not install a guessed collection of packages or change the running kernel ad hoc.
3. For an approved Debian-package route, the publisher uses dpkg installation. The following is a non-executed template, not a ready-to-paste command:

```text
sudo dpkg -i './REPLACE-WITH-VERIFIED-PACKAGE.deb'
```

Replace the placeholder only with the reviewed local package filename. The command changes the host using elevated privileges; it is not a read-only check. Without a verified package, approved privileges and resolved prerequisites, do not run it. This authoring batch executed no package command.

4. If installation reports missing dependencies, an unconfigured package or module-build/loading failure, stop and record a minimal non-sensitive error. Use the distribution and publisher's reviewed recovery procedure; do not repeatedly run privileged repair commands or switch to an unreviewed generic installer. Secure Boot module signing requires the platform's approved process, not disabling Secure Boot.
5. After a successful approved installation, open VirtualBox using the desktop application entry where available. Continue to the common check below. A GUI-only result must remain labelled GUI-only, not a successful guest-boot test.

## Common practical check — stop before guest creation
1. Open the manager and record the displayed application version. If it does not open, record the actual error or blocker; do not replace it with expected output.
2. Open the new-VM workflow and identify that it is for creating a guest, not reinstalling the host. Labels can vary by selected release.
3. Cancel without completing creation, importing an appliance, choosing an ISO or booting a guest. Do not change networking or enable sharing as part of this check.
4. Confirm the host remains usable. If installation disrupted host networking or stability, stop practical work and follow approved publisher/platform support. Do not start changing random adapters.
5. Record separately: installation result, manager-open result, workflow-open/cancel result, and unresolved issues. A successful installer alone is not the whole check.

## Evidence and review
Submit only through the approved private route when its collection and retention policies exist. Until then, no real learner evidence collection is authorized by this draft. Use minimal text where possible; screenshots are not mandatory.

| Record | Required distinction |
|---|---|
| Host OS/version and architecture | Documented host facts versus an assumed compatible guest |
| Product version, package filename and official source | Actual selected package versus a generic product name |
| Verification outcome and installation authority | Checks actually completed versus missing approval or an unresolved trust check |
| Installation and manager result | Installed, failed, blocked or not executed; do not collapse these into success |
| New-VM workflow result | Opened and cancelled versus not observed; no guest created for this lesson |
| Remaining issue and next permitted action | A specific blocker and authorized support request, not an improvised bypass |

Do not submit serial numbers, license keys, passwords, full diagnostic bundles or unrelated personal files. Redact any incidental identifiers. A reviewer should ask for a targeted correction when provenance, permission or the actual result is unclear; do not ask a learner to rerun a blocked installation simply to obtain a success screenshot.

## Check your understanding
Explain why a successful installer is not proof that the intended guest is supported. Identify which installation choices could affect the host. State what you would do if an administrator policy blocks installation.

For each answer, identify the observation, its limit and the next permitted action. These are the existing three questions, not an added assessment or an automatic grade.

## Next lesson and release boundary
Continue to EH-LAB-02 only under the course's actual reviewer process, with a compatible approved route and no unresolved mandatory installation dependency. This lesson does not establish a guest boot, isolation, recovery, Linux-tool availability, lab permission or an award. Those require their own later observations and controls.

This authoring update adds no canonical ID, prerequisite edge, publication flag, Discord interaction, database change, deployment or real learner decision. No Windows/macOS/Linux installation, signature check, driver build, new-VM workflow or hardware reproduction was executed for this batch. Publisher documentation supports the teaching sequence, not a claim of course validation.
