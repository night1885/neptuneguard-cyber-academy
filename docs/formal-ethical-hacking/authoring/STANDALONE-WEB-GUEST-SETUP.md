# Standalone web — guest setup draft

Status: proposed in-course setup, not hardware-tested, published or approved for execution. This document does not authorize host changes, purchases, downloads or practical testing. It does not close the terminal bridge's setup blocker.

## Independent entry

No CPTS, OSCP or GPEN enrollment/completion is required. Shared lab lessons are teaching references, not cross-course enrollment gates. Use the reviewed equivalent-skills route or provide the web course's own supported setup teaching and assessment. An existing VM is not automatically accepted.

## Model and readiness

The host is the physical computer/OS; a hypervisor manages guests with virtual resources. A guest is not permission to test another system. Before any installation, record only necessary non-sensitive host OS/architecture, available resources, installation permission and support needs. Do not collect serial numbers, credentials or full inventories in this repository.

Confirm a documented host/hypervisor/guest combination, licensing, resource allocation and recovery capacity with authorized support. Preserve important host data using the owner's trusted backup process. Do not disable host protections, bypass organization policy, improvise architecture compatibility or purchase equipment on this draft's authority. Exact supported versions and resource allocations remain unvalidated.

## Proposed preparation sequence

1. Review the shared [host virtualization lesson](../lessons/EH-LAB-01.md). Its own readiness prerequisite must be reviewed/adapted into this course before delivery; this document does not claim that prerequisite is complete. Confirm publisher documentation for the exact platform and approved installation privileges. Stop if the route is unsupported or policy blocks it.
2. In the separately approved preparation phase, obtain host software and matching guest media from their publishers. Record version, architecture, source and date. Follow publisher identity/signature checks. For guest media, authenticate the publisher's checksum information before comparing the image; do not substitute an invented checksum or an untrusted matching hash.
3. Follow the shared [offline workstation lesson](../lessons/EH-LAB-02.md) only after setup approval. Inspect every guest adapter before first boot and disable them for the offline installation. Disable shared clipboard, drag-and-drop, shared folders and unnecessary passthrough. Do not attach NAT/bridging to make an unexplained dependency disappear.
4. Confirm the installation destination is the guest virtual disk before any erase choice. Stop on uncertainty. Create unique private local credentials; never submit them as evidence. If installation requires unavailable downloads, record a provisioning blocker rather than changing the network boundary.
5. After installation, power off, detach installation media and boot from the guest disk. Review actual OS/architecture, interfaces and IPv4/IPv6 routes using the shared lesson's bounded checks. Their output alone is not a complete isolation proof.
6. Check required shell/utilities and later Python/curl availability against the reviewed lesson requirements. Missing dependencies require an approved provisioning route. Maintenance must have its own review and a return-to-isolation check; offline does not mean patched or invulnerable.
7. Shut down cleanly and create a named recovery baseline through the reviewed hypervisor workflow. A snapshot is not an independent backup, and its existence is not proof of a successful restore. Controlled recovery teaching and execution remain required before acceptance.

No commands are added here. Publisher/platform instructions, screenshots, exact settings and their compatibility must be verified for the selected route before these teaching references become executable learner instructions.

## Learner explanation and review

Ask the learner to explain host versus guest, architecture matching, integrity versus authenticity, preparation versus offline exercise, all-adapter inspection, provisioning blockers and snapshot versus tested recovery. Use fresh fictional cases for discussion before practical work.

For a later approved setup review, require minimized provenance/verification outcomes, redacted configuration, actual tool availability, unresolved issues and recovery observations in an approved private evidence route. No real learner submissions belong in this repository. Record support and substantive hints separately; a copied inventory or a successful installation does not prove understanding or isolation.

## Remaining acceptance gates

The readiness prerequisite, platform-specific supported route, resource options, offline provisioning, controlled recovery, accessibility walkthrough, actual student-guest reproduction, private evidence handling and independent assessor review remain open. Existing shared lessons are drafts, not evidence that this setup has run successfully. Record blocked conditions explicitly; do not mark W00 complete or unlock W01 from this document.

No catalogue IDs, prerequisite edges, runtime registry, learner records, permissions, Discord messages, database, deployment or awards change. This adds no target machine, network test or vulnerability exercise.
