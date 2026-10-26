# Home-lab manifest — authored status reconciliation

This is an authoring-metadata correction, not acceptance of a lesson, lab, platform or release. The six EH-LAB-00 through EH-LAB-05 Markdown files exist in the repository, so their manifest status descriptions should not call them merely uncommitted conversation drafts. File existence does not imply that setup instructions are complete, compatible or reproduced.

## Status meanings
| Lesson | Corrected status | What remains unresolved |
|---|---|---|
| EH-LAB-00 | authored-draft-policy-review-pending | Actual authorization, support, incident and privacy policies; supported readiness route |
| EH-LAB-01 | authored-draft-supported-route-untested | Validated host/hypervisor route, installation and recovery reproduction |
| EH-LAB-02 | authored-draft-hardware-validation-pending | Supported guest setup, provisioning, verification and recovery on student hardware |
| EH-LAB-03 | authored-draft-two-vm-validation-pending | Complete two-VM topology, isolation and controlled recovery reproduction |
| EH-LAB-04 | authored-draft-full-two-vm-test-pending | Complete peer-service exercise and permitted client observations in the actual two-VM setup |
| EH-LAB-05 | authored-draft-rubric-not-calibrated | Reviewer calibration, assessment policy and approved private evidence workflow |

These descriptive strings are authoring states, not implemented runtime transitions or decisions about an actual learner. The earlier EH-LAB-04 label referred to limited loopback checks; this edit does not invalidate or expand that historical record and claims no new service execution.

## Change boundary and checks
The source manifest had Git blob db37268a320d139d90a19664ba8758eb9a4d868b. A local parsed-JSON comparison verified that the proposed manifest changes exactly the six lesson status values. After restoring those old status values in a comparison copy, the complete JSON object equalled the original. All other fields, including lesson IDs/order, titles, prerequisites, acceptance criteria, notices, navigation intent, authorization rule and all ten release blockers, were preserved.

Root status remains draft-not-published. Every lesson retains publishable:false. runtimeIntegration remains false, Community Learning remains excluded and the architecture remains undecided-discord-or-web. No lab provisioning, role changes, spending, private data collection, deployment, activation or runtime integration is introduced.

No schema migration, application import or integration test was executed for this metadata-only batch. It does not claim compatibility with a future status-consuming implementation; any such adapter must be separately specified, reviewed and tested before integration. The six-lesson home-lab manifest is not replaced by the separate 36-entry curriculum catalogue.

## Relationship to recent structural checks
At pinned source commit 41423a0a2a3fa911ae7d68f9a13c6a600ca1a7d1, bounded checks established catalogue/index coverage for 36 entries, existence of all 64 local README file targets against GitHub inventory, and structural validity of 36 catalogue nodes with 64 prerequisite edges. Those checks did not reproduce a lab, review every lesson's semantic prerequisites, run full-checkout CI, calibrate assessment or implement a learner workspace.

The locally generated JSON reports are separate artifacts, not automatically committed CI evidence. This status reconciliation does not retroactively broaden any result or mark a release blocker complete.
