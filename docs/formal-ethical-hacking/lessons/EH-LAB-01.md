# EH-LAB-01 — Host virtualization installation

Draft for review; not hardware-tested or published. Requires EH-LAB-00. Students own and operate their labs; the academy provisions no machines.

## Outcomes
Explain host versus guest, install a suitable hypervisor from its publisher, record versions without exposing personal identifiers, and identify a recoverable setup failure.

## Understand the components
The host is your physical computer and operating system. A hypervisor manages virtual machines. Each guest has virtual processors, memory, disks and network interfaces. Guest settings do not replace host security controls. A VM is not permission to test external systems.

This draft uses VirtualBox terminology as a candidate route, not a promise of compatibility with every host. Use the official manual at https://www.virtualbox.org/manual/ to check the actual host OS, CPU architecture and guest combination. An x86 image is not an interchangeable substitute for an ARM image. Stop if your combination is undocumented or unsupported; do not improvise a cross-architecture route or buy equipment on the strength of this draft.

## Before installation
1. Complete the non-sensitive readiness inventory from EH-LAB-00.
2. Confirm permission to install software and sufficient space for two guests, their virtual disks and recovery data. Exact allocations require platform validation; this draft sets no universal minimum.
3. Back up important host data using your normal trusted process. Save open work before installation or restart.
4. Find the official publisher download and documentation for your exact platform. Record product version, source URL and download date. Review applicable licensing; do not assume optional extensions are required or freely licensed for every use.
5. If firmware virtualization or host security settings need attention, use the device/platform documentation and authorized support. Do not disable protections or organizational controls to force installation.

## Installation workflow
1. Download the correct host installer from the publisher, not an advertisement or repackaged mirror.
2. Follow publisher verification instructions where provided. Check the installer identity/signature using your platform's documented controls. Stop on a mismatch or unexpected publisher.
3. Run the platform installer with approved privileges. Read component choices and prompts; network-driver installation can affect host networking. Do not add optional extensions without an identified course need and license review.
4. Restart only when required, then open the manager and record the installed version.
5. Confirm you can open the new-VM workflow; cancel without creating or booting a guest. Guest construction belongs to EH-LAB-02.

Exact OS-specific screenshots, package commands and tested versions remain release work, not steps silently assumed complete here.

## Troubleshooting decisions
- Installer blocked: preserve the non-sensitive error and ask authorized support; do not bypass policy.
- Unsupported architecture: stop and request a documented alternative.
- Virtualization unavailable: check vendor guidance; do not make unexplained firmware changes.
- Host networking disrupted: stop practical work and use the publisher's recovery guidance; do not start changing random adapters.

## Evidence and review
Submit a redacted version record, host OS/architecture, official source, installation result and unresolved issues. Do not submit serial numbers, license keys or full diagnostic bundles. A reviewer checks whether the route is documented and the student understands host/guest separation. Installation alone does not prove networking isolation or authorize practical testing.

## Check your understanding
Explain why a successful installer is not proof that the intended guest is supported. Identify which installation choices could affect the host. State what you would do if an administrator policy blocks installation.
