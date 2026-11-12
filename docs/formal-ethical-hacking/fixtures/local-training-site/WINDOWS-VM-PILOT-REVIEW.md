# Windows VM pilot reviewer checklist

Draft reviewer aid, not a completed validation or supported-platform release. Owner supplied only the intended Windows-host/VM topology. No actual Windows version, architecture, resources, hypervisor or guest build has been established. This planning batch changes no host/VM setting or runtime code.

## Before approving a manual session
- [ ] Actual host/guest architectures and publisher-documented hypervisor compatibility recorded.
- [ ] Installation permission, host backup and capacity/allocation reviewed without invented universal minimums.
- [ ] Existing EH-LAB-00/01/02 prerequisites satisfied; authenticated image verification and clean guest preparation recorded.
- [ ] All virtual adapters, sharing and unnecessary passthrough reviewed under EH-LAB-02; no guessed network workaround.
- [ ] Guest Python/browser and exact reviewed materials available through an approved transfer/provisioning route.
- [ ] Ordinary-user app execution, exact manual paths/counts and scope understood; no root/security-policy bypass.
- [ ] Actual support/incident/recovery contact and private evidence/access/retention route supplied.
Any unresolved mandatory item means BLOCKED. Do not fill a tick from CI success or the existence of a tutorial.

## Before accepting the observation record
- [ ] Guest terminal AND guest browser used; host-side localhost/VM-IP/port-forwarding tests excluded.
- [ ] Actual observations are distinct from expected 200/404 outcomes and source predictions.
- [ ] Four-intentional-GET manual limit and possible background-request allowance understood; uncertain counts caused a stop, not a retry loop.
- [ ] Normal denial was not invented into a vulnerability finding; fixed actor was not called authentication.
- [ ] Human readability/keyboard/accessibility findings and unattempted checks recorded honestly.
- [ ] Actual Ctrl-C/exit evidence and any separately approved restart recorded; no released-port reconnection or unrelated process stop.
- [ ] Isolation, recovery, host compatibility and other untested limits remain explicit.

## Reviewer outcome
Actual reviewer/date/version and evidence location: ____________________.
Decision (BLOCKED / more review required / selected observations accepted): ____________________.
Accepted observations and unresolved limits: ____________________.
Any broader supported-platform/learner-pilot approval requires its own explicit review; this checklist grants none.

## Authoring record and boundaries
The runbook was aligned with repository EH-LAB-01 blob 57f099471b478e123e654756ca29616f430ecd53 and EH-LAB-02 blob 75190943022586f0a3186d8f76cdd3738ced17e2. Those source lessons explicitly remain draft/hardware-unreproduced. The current authoring source snapshot is 3301bf28c3151800524da37f8bc6e5158edf024b. The owner has not confirmed VirtualBox or an Ubuntu release; both stay candidate choices.

Only document assembly, local-link checks and package readback were performed for this batch. No Windows machine, hypervisor, VM, adapter, guest account, installer, snapshot, image verification, browser or app was operated. No hardware, provisioning, recovery or human accessibility result is claimed. The known CI conclusions belong to their prior source snapshot, not a Windows VM pilot.

No application/test/workflow change, new canonical course entry, learner record, Discord/Render/PostgreSQL integration, company/external testing, merge, deployment or learner activation is included. Committing these documents may rerun the already configured bounded PR jobs; that is not manual-pilot execution. The PR description is intentionally not edited for each small authoring step.
