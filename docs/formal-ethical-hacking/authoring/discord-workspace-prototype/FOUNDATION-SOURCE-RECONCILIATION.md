# Foundation source-contract reconciliation

Draft source review only. Source revision: f92216c3372cf3b565227c8e3e9b4d87c2eefa34. Profile-pin commit: 7b0bcc0d969b635db5c5794d70284786ddefc62f. This follow-up updates four existing test expectations; no lesson, compiler, controller, authorization, catalogue identity, publication flag or runtime integration changes.

## Candidate expectations
| Profile | Sources | UTF-8 bytes | Reading pages | Views |
|---|---:|---:|---:|---:|
| reading | 3 | 25072 | 21 | 68 |
| lab-linux | 11 | 58398 | 51 | 90 |
| foundation | 13 | 66140 | 58 | 95 |

The actual changed lesson bodies were Git-blob verified; both identities were recomputed. The unchanged compiler reconstructed them completely at 6/7/8 pages. Fifteen selected rejection cases passed using a minimal three-ID catalogue fixture, not the full catalogue. Both actual NET bodies and the compiler were also blob verified; their measured counts are 4/3 pages and 4041/3701 bytes. Earlier draft estimates of 59 foundation reading pages and 96 views were incorrect. Larger-profile totals retain unchanged-source expectations; full-profile/renderer execution remains required.

All four test candidates match the previously checked candidate Git blobs and pass Node syntax checks. Static assertion-call counts remain 46/33/30/26, with no skips or todos added. Earlier isolated patch checks passed against blob-identical baselines. These checks are not complete suite execution. Existing source reconstruction, hash/mutation/path/coverage rejection, default-off, navigation, revocation, expiry and stale/foreign-control checks remain. LAB-02 additionally requires its explicit no-NAT/bridged/host-only sentence.

The dedicated formal-workspace-validation workflow explicitly includes all four suites on Node 20/22 and runs additional runtime, synthetic, installed-SDK and rendering checks. The existing owner-preview workflow separately runs its four-Node matrix and selected authoring checks. Candidate CI results must be inspected before readiness; no full-suite pass is claimed here.

This is the second of two source-review reconciliation commits. Keep PR #58 draft pending validation and review. No merge, deployment, production setting, spending, learner record, publication, exercise authorization or award is approved. No hardware/media/isolation/recovery execution or independent review is implied. Any merge and deployment require separate resolved approval.
