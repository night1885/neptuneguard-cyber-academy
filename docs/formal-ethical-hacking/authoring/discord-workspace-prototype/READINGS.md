# Pinned foundation readings — detached card workspace

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

runtimeIntegration:false; publishable:false. Default-off. Baseline/source commit:
80c7803a147154912ee12b729ce527768f963c2d. Three existing student-facing drafts are
review inputs: EH-LAB-00, EH-LAB-01 and EH-LAB-02. No source lesson is edited or duplicated.
The manifest records exact relative paths, Git blob IDs and SHA-256 identities. A trusted
server must supply that reviewed manifest and the in-memory snapshots; never accept either
from an interaction. Matching hashes establish byte consistency with the supplied trusted
manifest, not authenticity, educational sufficiency or publication approval by themselves.

The compiler performs no file/URL loading and executes no source text. It rejects missing,
extra, wrong-path or changed snapshots and invalid review flags before exposing readings.
It bounds each source to 32 KiB, total to 256 KiB, line length to 1200 and display pages to
1400 characters/40 per source. Supported fenced blocks use three backticks and simple
language tags; unsupported/unclosed fences reject. Whole source lines are retained. Display
pages close/reopen continued fences; raw fragments concatenate EXACTLY to the original,
including whitespace/Unicode. This is not a complete Markdown parser, table renderer,
secret scanner or hostile-input sandbox. Live formatting and readability need review.

Actual imported content is 14,808 UTF-8 bytes: six EH-LAB-00 pages, four EH-LAB-01 and four
EH-LAB-02 pages. All original permission, privacy, unsupported-platform and stop conditions
remain in the raw reconstruction. No installer, guest, credential or network operation ran.
The full draft browser now has 61 cursors: 13 card groups, 14 source-reading pages and
34 other metadata previews. Those other bodies are explicitly NOT imported. Next/Previous
stay within a reading; Home returns to its group. There is no automatic next-lesson gate,
prerequisite enforcement, completion/progress, assignment, lab access or award grant.

Actual selected command: node --test readings.test.mjs. 28 new compiler/reading/composition
cases passed on Node v20.20.1, zero failures/cancellations/skips. Three new JS modules passed
syntax checks. Actual source snapshots and unchanged dependencies were Git-blob verified;
every one of 61 views compiled into bounded illustrated frames. Tests also used clearly
synthetic manifests/source strings for rejection, code-fence and capacity cases. Interaction,
member and grant objects were doubles; the actual unchanged controller/adapters composed.
Earlier 88-test and 18-card suites were NOT rerun. This is not a 116-test combined result,
full checkout, CI, real SDK/API/upload, learner walkthrough or supported-platform validation.

Only the tests read fixed repository sources; the application factories have no loader,
listener or published entry. Real bootstrap/content provenance, semantic/answer-privacy and
accessibility review, formal course registration/current providers, staging and release
approvals remain required. No live data collection, evidence storage, migration, production
flag or Community Learning change is included. Prior records retain their historical scope.
