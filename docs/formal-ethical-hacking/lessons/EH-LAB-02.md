# EH-LAB-02 — Prepare the offline learner workstation

Draft; no hardware reproduction claimed. Requires EH-LAB-01. This guide describes a clean Linux guest, not a weaponized image. Download and preparation are separate from the offline exercise phase.

## Outcomes
Verify installation media, build a clean guest without an external network adapter, create private credentials, and establish a recovery baseline.

## Acquire and verify media on the host
Use a distribution's official download service and select media matching the documented guest architecture. Record distribution, release, architecture, filename, source and date. Do not invent a checksum or reuse one for a different image.

For an Ubuntu candidate route, follow https://ubuntu.com/tutorials/how-to-verify-ubuntu . Obtain the ISO, SHA256SUMS and signature from official sources. Verify the checksum-file signature and independently check the signing-key identity according to the publisher's procedure, then check the ISO against the authenticated checksum. A matching hash alone does not authenticate an untrusted checksum file. Stop on missing trust checks, signature failure or mismatch. Do not execute text copied from a forum as a substitute for publisher verification.

## Create the guest
1. In the hypervisor's new-VM workflow, name the guest NG-Learner and select the matching guest OS and architecture.
2. Choose CPU, memory and a virtual-disk allocation using the validated route when available. Leave enough host resources for normal operation and the second VM. Record actual values, not guessed course minimums.
3. Select the verified installation ISO. Before the first boot, inspect every network adapter. Disable them all for this offline installation. Also disable shared clipboard, drag-and-drop, shared folders and unnecessary device passthrough.
4. Boot the installer. Confirm the destination is the VM's virtual disk. Disk erasure choices apply only to that virtual disk; stop if the destination is uncertain.
5. Use local installation options that do not require a network. Create a unique local account and password. Do not reuse institutional credentials or submit passwords as evidence.
6. If the installer requires downloads to finish, stop and document the dependency. Do not quietly attach NAT or bridge the VM to the physical network.
7. Complete installation, power off, detach the ISO, then boot from the virtual disk. Verify local login and inspect network configuration.

## Local baseline checks
On the Linux guest, record `cat /etc/os-release`, `uname -m`, `ip -br address` and `ip route`. These report OS, architecture, interfaces and IPv4 routes; they are not a complete isolation proof. Review IPv6 separately with `ip -6 route`. With adapters disabled, do not expect a usable external network. Redact unrelated personal data.

Check whether `python3 --version` and `curl --version` succeed. Later exercises require these tools. Missing tools are a provisioning blocker: prepare a reviewed offline dependency route with the instructor, rather than reconnecting the exercise guest ad hoc. Offline guests are not magically patched or safe; any update/maintenance phase needs its own reviewed procedure and a return-to-isolation check.

## Recovery baseline
Shut down cleanly and create a named baseline snapshot through the hypervisor. Record what the baseline contains. A snapshot supports rollback but is not a substitute for a separate backup of important data. Restoring an old baseline also restores its old configuration and software state.

Do not claim recovery was tested merely because a snapshot exists. The controlled recovery exercise is in EH-LAB-03.

## Evidence and assessment
Provide image provenance and verification outcome, the guest inventory, redacted adapter settings, baseline name and tool availability. Explain the difference between integrity and authenticity, why all adapters were inspected, and what remains unverified. Do not submit private keys or credentials. Proceed only after a reviewer can identify a complete, compatible setup and no unresolved mandatory dependency.
