# Student-built home-lab batch — review and validation

Draft documentation batch for EH-LAB-01 through EH-LAB-05. EH-LAB-00 remains the prerequisite. Students build and run the machines on equipment they are permitted to use. Academy-hosted machines, provisioning, capacity management and cloud spending are out of scope for now. Curriculum and platform scope otherwise remain unchanged.

## Honest validation state
Prepared against official virtualization and Ubuntu verification documentation. No supported-hardware matrix, end-to-end VM execution, OS-specific screenshot validation, licensing review or instructor calibration has been completed by authoring these files. No commands in these lessons are claimed to have been executed. Earlier conversation artifacts are not silently imported.

The existing manifest stays draft-not-published and publishable=false. Its earlier per-lesson status text is conservative historical metadata and has not been reconciled by this batch; the presence of these drafts does not satisfy its acceptance criteria. Runtime code and Community Learning are unchanged.

## Release checklist — all unchecked
- [ ] Select supported host OS/architecture combinations and exact tested versions.
- [ ] Record measured host/guest resource allocations and practical limitations.
- [ ] Reproduce installation, signatures and guest media verification.
- [ ] Validate offline installation and Python/curl availability or provide reviewed offline dependencies.
- [ ] Confirm guest identity separation, all adapters, integration features, IPv4/IPv6 routes and forwarding paths.
- [ ] Execute two-way bounded connectivity and the deliberate network-name fault.
- [ ] Execute snapshot recovery and document temporary addressing behavior.
- [ ] Run HTTP fixture, GET, HEAD, logs and stopped-service checks across the two VMs.
- [ ] Verify cleanup, backup guidance and failure recovery on each supported route.
- [ ] Review accessibility, licenses, private submission, retention, support and incident procedures.
- [ ] Calibrate assessment with instructor examples and independent student work.
- [ ] Reconcile manifest statuses only after validation evidence exists.
- [ ] Obtain separate publication/deployment approval.

## Sources
Oracle VirtualBox manual: https://www.virtualbox.org/manual/
Oracle internal networking explanation: https://docs.oracle.com/en/virtualization/virtualbox/6.0/user/network_internal.html
Ubuntu image verification: https://ubuntu.com/tutorials/how-to-verify-ubuntu

These documents support planning and terminology. They do not prove this course's exact configuration has been tested, certify isolation or authorize testing any third-party system.
