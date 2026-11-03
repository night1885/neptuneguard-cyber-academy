# Lab-and-Linux pinned reading profile

## 2026-11-02 — Current bounded-profile correction candidate

Source checkpoint: 4ae5f6deab77b5e369436366c9850b670e52b0ff. Recent approved teaching edits invalidated the older pins. Refresh exact identities; retain runtimeIntegration:false, publishable:false, compiler/path guards and the existing 100-view renderer cap. Expanded bodies cannot share the earlier all-in-one reading package without exceeding that cap.

| Existing review profile | Included bodies | UTF-8 bytes | Reading pages | Total views |
|---|---|---:|---:|---:|
| reading-sources.json | EH-LAB-00/01/02 | 37989 | 32 | 79 |
| lab-linux-sources.json | EH-LINUX-01 through 05 | 46678 | 38 | 83 |
| foundation-sources.json | EH-LAB-03/04/05 and EH-NET-01/02 | 57366 | 48 | 93 |

The union retains the same thirteen bodies exactly once, with prerequisite closure checked across profiles. Each instance still uses the complete canonical metadata catalogue; bodies outside its selected profile remain explicit metadata previews. Trusted maintainers select a profile separately. No learner profile switcher, live bootstrap integration or single-session thirteen-body course is implemented by this correction. Course scope, canonical prerequisites and practical permissions are unchanged.

Foundation interaction tests retain Open/all pages/Previous/Home, grant revocation, role revocation, foreign-actor and stale-control coverage for every one of the thirteen lessons, selecting its fixed profile per synthetic test instance. No compiler or renderer limit is raised; no source-integrity check is removed. Safety-phrase assertions follow the approved revised wording, not an expanded practical scope.

All eight changed source identities were byte-verified against GitHub-observed Git blobs before SHA-256 calculation. Selected unchanged-compiler checks ran locally on Node v20.20.1 in two batches of four changed sources. Earlier batch results are carried forward, not relabelled as a single full-suite run. Unchanged Linux 03-05 page counts and the combined seven NET 01/02 pages are retained from the inspected existing tests. The four proposed test files received syntax checks only; their full repository/controller execution and GitHub CI must be verified after the separately approved commit. No pass, deployment or learner release is claimed here.

## Historical record — earlier snapshots and results, not current totals

runtimeIntegration:false; publishable:false. Optional review data, not activation.
Baseline 71960ae7a63ca68e74498aca08dbaa0262b5f9ff. Select lab-linux-sources.json only
through trusted server bootstrap with the exact in-memory snapshots. Application code,
existing reading-sources.json, original lessons and original tests are unchanged.

The profile covers EH-LAB-00 through EH-LAB-05 and EH-LINUX-01 through EH-LINUX-05:
eleven pinned sources, 48,134 UTF-8 bytes, 44 reading pages. Eight bodies are new to the
reading profile; the original three keep their 6/4/4 page counts. Lab 03/04/05 give 4/3/3
pages; each Linux lesson gives four. The existing browser fits 83 states: 13 card groups,
44 reading pages and 26 explicit metadata previews. No navigation limit was raised.

All source text reconstructs byte-for-byte; whole lines and balanced display fences were
checked, including actual shell/HTML examples. No lesson command, network request, listener,
guest, signal, privileged action or learner practical was executed. Existing stop conditions,
privacy limits and external prerequisites remain text, not satisfied gates. EH-LINUX-05 still
requires EH-NET-02, whose body is not included here. This is not a complete first-journey
rehearsal, supported setup, full programme or new permission to run those examples.

Actual selected run: node --test lab-linux.test.mjs. 20 new data/compiler/renderer cases
passed on Node v20.20.1, zero failures/cancellations/skips. Eleven text copies, compiler,
renderer, catalogue, labels and original profile were Git-blob verified. All 83 view shapes,
bounds and server routes, exact source reconstruction, fence parity, profile preservation,
missing/extra/changed sources and scope markers were checked. This batch did NOT exercise
the Discord interaction controller, gateway/API, image upload or SDK serialization. Earlier
28/88/18-test suites were NOT rerun; no combined/full-checkout/CI result is claimed.

Hashes establish consistency with a trusted reviewed manifest, not authenticity or release
approval alone. Snapshot acquisition is still a reviewed bootstrap responsibility; factories
have no file/URL loader. The test loader restricts paths before reading fixed repository
sources and is not a production loader or sandbox. No protected instructor documents or
learner evidence were imported. Other 26 lesson bodies remain metadata-only. Native display,
accessibility, semantic review, authoritative providers/formal course registration, staging,
evidence policy and deployment remain separate gates. No progress/award, production flag,
command/modal navigation, public fallback or Community Learning change is introduced.
