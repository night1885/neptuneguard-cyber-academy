# Clipboard-disabled companion walkthrough

Draft usability companion, not startup approval or a replacement for LEARNER-VALIDATION.md, WINDOWS-VM-PILOT.md or their prerequisites. No app, request-budget or workflow change is introduced.

## Collect preparation facts together
Use WINDOWS-VM-PILOT-RECORD.md once to collect host/guest versions and architectures, capacity and compatibility review, authenticated installation media, tool versions, ordinary-user status, transfer provenance, all adapter/sharing/passthrough states, recovery/support route, and private evidence access/retention arrangements. Record unknowns explicitly. Do not repeatedly ask the owner to reauthorize the same scope; permission is distinct from technical readiness. Missing mandatory items remain BLOCKED.

## Keep transfer commands short
Leave clipboard sharing, drag-and-drop, shared folders and guest networking disabled. From the transfer-disc directory, run:

```bash
sha256sum -c SHA256SUMS
```

Copy only the three packet files into a NEW ordinary-user directory under the reviewed transfer procedure. Repeat the manifest check there. For the independent comparison, type:

```bash
sha256sum training_site.py
```

Compare every character against the separately supplied trusted value for the exact reviewed revision. A manifest on the same medium is not an independent authenticity anchor. No long expected hash needs typing into Bash. Detach the transfer medium after verification. Transfer completion does not authorize startup.

## Approved session only
Record predictions before requests. After the actual setup/scope gate and separate session approval, use the reviewed launcher from the working directory:

```bash
cd ~/ng-lab
python3 -B training_site.py
```

Use only the exact newly printed owned loopback origin in the guest browser, never a copied example port or the Windows host browser. Keep a navigation tally: at most four intentional GET navigations total, using /, /exercise/own, /exercise/other and /exercise/missing. Order may be recorded accurately rather than assumed. Do not add a home-page visit between checks. No refresh, guessed route, query, scanner, proxy or extra client tool is supplied. Background requests can consume the existing 20-handled-attempt allowance. Stop on unexpected 429 or uncertain accounting.

## Evidence with limited screenshots
Agree the approved private evidence route first. Accept brief typed observations when practical; do not require a screenshot after every action or enable sharing to collect evidence. Distinguish user reports from screenshots actually reviewed. Record visible text separately from HTTP status; do not claim an uninspected status code. Missing evidence remains unverified rather than an assumed pass.

If a wrong link is clicked, do not refresh or navigate again. Inspect the current address without submitting it and record the path and complete visit sequence. If accounting is uncertain, stop instead of retrying.

## Stop and hand off
Use Ctrl-C only in the owned launcher terminal. Record whether the prompt returned or exit remains uncertain. Do not kill unrelated processes, reconnect to a released port or restart automatically. A new session requires separate approval. Keep owner rehearsal, learner questions and project development distinct; learner questions need not be imposed on the owner during a build review.
