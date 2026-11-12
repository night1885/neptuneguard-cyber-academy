# Partial owner rehearsal - 2026-10-26

Conversation-derived record, not independent inspection, completed pilot approval, or learner assessment. Application source: e496df356cac1021f81f174eedc4a4b9ff0a77d8.

## Reported setup
- Owner reports a personally owned device dedicated to the programme, authorization for the local rehearsal, and a dedicated VM without personal accounts.
- Host reported: Windows 11 26H2, x64; VirtualBox version supplied as 7.2.22r with revision digits unspecified. Exact host build, capacity, installation-media authenticity and supported-platform review were not established.
- Guest screenshot reports Ubuntu 24.04.4 LTS; guest architecture reported as x86_64. Python 3.12.3, Firefox 147.0.3 and UID 1000 were reported.
- All virtual adapters and sharing settings were reported disabled. This is not complete isolation or passthrough evidence.
- Owner reports an option to restore or rebuild the VM. Recovery was not tested; baseline contents and support route were not independently established.
- Owner may use screenshots and may not retain notes. Approved evidence access/retention arrangements remain unresolved. Raw screenshots are not included here.

## Observations and limits
- User reported both manifest entries OK before and after copying into ~/ng-lab.
- Screenshot showed the application SHA-256 matching e80d201b46021f8b71e59ccd1c65a2205d0a72be8aa59d258fe92e09a6a81d29.
- Optical-medium detachment was reported complete after a force-unmount prompt.
- Launcher screenshot showed an owned loopback URL and training-only startup text. No browser response was observed directly by the reviewer.
- User supplied home-page training/no-authentication text and own-note fictional text matching source predictions.
- User also supplied generic not-found text, then explained a wrong link was clicked. The path and complete navigation sequence were not established. Other-note and missing-note checks were not separately verified.
- HTTP status codes, background-request count and accessibility behavior were not inspected.
- User reported completion after Ctrl-C instructions. Prompt return and process exit were not separately verified.

## Review outcome
Partial owner rehearsal; more review required. The required setup/scope gate was not fully evidenced before startup. Later ownership approval and successful observations do not retroactively complete that gate. No vulnerability, certified compatibility, tested recovery, learner activation or completed four-path assessment is claimed.

Before another session, resolve the outstanding setup/support/evidence items under LEARNER-VALIDATION.md and WINDOWS-VM-PILOT-REVIEW.md, then separately approve the session. Do not reconnect to the previous released port.
