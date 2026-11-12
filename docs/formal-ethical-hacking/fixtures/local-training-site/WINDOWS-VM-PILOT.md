# Windows-host/Linux-guest pilot runbook (candidate)

Planning document only. Confirmed by the owner: Windows hosting a VM. Windows edition/build, CPU architecture, RAM/free disk, installed hypervisor/version and actual guest/version remain UNCONFIRMED. Ubuntu Desktop and VirtualBox are candidate choices, not selected, installed, tested or supported combinations. Do not create or change a VM from this document while mandatory setup facts are missing.

## Follow the existing preparation route
Read [EH-LAB-01](../../lessons/EH-LAB-01.md) and [EH-LAB-02](../../lessons/EH-LAB-02.md), including their prerequisites. They remain draft and hardware-unreproduced. This selected practical uses one clean guest; it does not replace the programme's separate two-VM exercises or capacity review. No universal RAM/CPU/disk allocation is supplied.

A reviewer must confirm the actual Windows/architecture/hypervisor/guest combination using publisher documentation, permitted installation rights, host backups, capacity and the actual support route. Do not disable host protection, organizational policy, Hyper-V-related features or firmware controls to force an unknown combination. Unsupported or undocumented combinations mean BLOCKED, not a cross-architecture workaround or equipment recommendation.

## Preparation phase: no exercise traffic
Follow the reviewed installation/media-verification route, not an assumed installer wizard. Verify the actual Linux image with its publisher's authenticity/checksum procedure. Existing EH-LAB-02 calls for the clean NG-Learner guest, all virtual network adapters disabled before offline installation, shared clipboard/drag-and-drop/shared folders and unnecessary passthrough disabled. A successful installer or disconnected adapter is not complete isolation evidence.

Prepare Python, a guest browser and the reviewed fixture files through the approved provisioning/material-transfer route. A missing browser/tool or installer download dependency is a blocker: do not reconnect the exercise guest ad hoc, enable clipboard sharing or improvise a new transfer path. Separate maintenance/provisioning needs its own reviewed procedure and return-to-isolation check. Record what a recovery baseline contains; snapshot existence is not tested recovery or a replacement for important-data backup.

## Preflight before any app launch
Use [WINDOWS-VM-PILOT-RECORD.md](WINDOWS-VM-PILOT-RECORD.md). Record actual facts, source commit, redacted adapter/sharing state, tool versions, ordinary-user status, support/recovery contact and private evidence/access/retention route. EH-LAB-02's guest OS/architecture/address/route checks are local observations, not connectivity probes or proof of isolation. A successful tool-version command does not validate the whole guest.

The application and browser both run INSIDE the same Linux guest. Do not open the guest's printed loopback URL in the Windows host browser. The selected activity uses only the owned 127.0.0.1 listener and OS-selected port; no VM IP, NAT/bridge/host-only network, port forwarding, guest external connection, company domain or additional host service is needed or authorized. Review every adapter rather than assuming a default setting is safe.

## Execute only after the real setup/scope gate
Follow [FIRST-PRACTICAL.md](FIRST-PRACTICAL.md) and [LEARNER-VALIDATION.md](LEARNER-VALIDATION.md) unchanged. Start the reviewed training_site.py from an ordinary-user guest terminal only when approved. Root rejection is a blocker, not permission to switch users or edit the guard to force a result. The browser uses only the exact owned local URL printed by that launcher.

Manual scope remains at most four intentional fixed-path GET navigations per separately approved session: /, /exercise/own, /exercise/other, /exercise/missing. The existing 20-handled-attempt allowance can include background browser requests; stop on uncertain accounting or unexpected 429. Do not replay author CI's POST, 21st-request exhaustion or automated navigation plans. No scanner, guessed URL, query, credentials, proxy or extension is introduced.

Record actual label/own-note/denied/missing observations, readability/keyboard issues and blockers, separately from predictions. Use Ctrl-C only in the owned launcher terminal; record the actual exit or uncertainty. Do not stop unrelated processes or reconnect to a released port. A fresh manual session needs its own approval under the existing brief and is not a budget bypass.

## Review, not automatic progression
Complete the pilot record and [WINDOWS-VM-PILOT-REVIEW.md](WINDOWS-VM-PILOT-REVIEW.md). CI success is selected author evidence, not reproduction on this Windows/guest combination. Human terminal use, accessibility, hardware compatibility, recovery and private evidence handling need actual observation/review. No supported-platform claim, grade, award, merge, publication, vulnerable-mode hosting or learner activation follows from authoring these documents.
