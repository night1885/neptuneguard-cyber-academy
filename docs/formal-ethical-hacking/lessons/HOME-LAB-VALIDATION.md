# Student-built home-lab batch — review and validation

Draft, not published. This revision expands EH-LAB-00 through EH-LAB-02 only; EH-LAB-03 through EH-LAB-05 retain their original scope. Students own/run the machines. Academy-hosted labs, cloud spending and Community Learning changes remain outside the batch.

## Evidence with separate scopes
- Owner-inspector delivery: source 55b77f8b7f7ec83e22db5b6eac414a87e23ecbcd was deployed. The owner reported reviewing material and using Next/Previous successfully; supplied screenshots show EH-LAB-00/01/02. That is owner UI evidence, not hardware, isolation, learner-role, accessibility, grading or course-release acceptance.
- Documentation: Oracle 7.2 installation/creation/security guidance and Ubuntu's verification tutorial informed the draft. Old package examples and signing-key IDs were not adopted as tested current profiles. Publisher support and an academy-tested configuration remain distinct.
- Source preparation: headings, document bounds, local links and shell syntax can be checked without executing commands. Shell syntax is not operational validation. The new baseline instructions teach immediate exit-status recording here instead of requiring the later EH-LINUX-03 lesson first.
- Unperformed: host installs; supported-hardware/version/resource matrix; authenticated media; guest build/boot; original screenshots; two-VM isolation, faults, recovery and HTTP work; actual licensing/support/privacy decisions; independent assessor calibration.

Both manifests keep conservative draft/publication flags. No learner workflow, persisted state, permission or award is created by expanding Markdown. The historical gap analysis is index-level triage: Windows/Python supporting drafts exist but are not canonical entries or evidence of completed competencies.

## Release checklist — not completed by authoring
- [ ] Select exact supported host/guest/architecture/toolchain routes and versions; review experimental-platform exclusions.
- [ ] Measure host/two-guest resources, disks and recovery needs.
- [ ] Reproduce installer identity, signing-key trust and digest checks.
- [ ] Validate offline installation and observation/Python/curl tooling or a reviewed dependency/transfer route.
- [ ] Inspect guest identity separation, all adapters/integrations and IPv4/IPv6/forwarding paths.
- [ ] Execute the authorized connectivity, deliberate network-name fault and controlled recovery.
- [ ] Reproduce cross-VM GET/HEAD, logs and stopped-service checks.
- [ ] Supply support/incident, accessibility, licensing and private review/retention arrangements.
- [ ] Calibrate on independent work; approve actual completion/certification policy separately.
- [ ] Reconcile statuses only after evidence; obtain separate learner publication/activation approval.

Proposed maintainer-only criteria: [Foundation setup review](../authoring/FOUNDATION-SETUP-REVIEW.md). This is not a learner-reader allowlist entry. No new pilot/staging service is imposed; use actual approved policy rather than converting historical draft plans into runtime rules.

## Sources
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/installation.html
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/create-vm.html
https://docs.oracle.com/en/virtualization/virtualbox/7.2/user/Security.html
https://ubuntu.com/tutorials/how-to-verify-ubuntu
