# EH-WEB-09 — local author validation

Draft validation record, not publication approval. The exact proposed upload_lab.py starter and test_upload_lab.py contents were executed in a fresh local temporary directory on Python 3.12.8.

## Observed results
- The supplied suite contains ten unittest methods.
- The deliberately incomplete starter returned test-command status 1 with seven assertion failures and three passing methods.
- A temporary repair combining the explicit filename full-match, declared-type equality, bytes/length checks and PNG_PREFIX comparison returned status 0 with all ten methods passing.
- The temporary repair was not proposed for commit; the repository retains the teaching defect. Visible expectations were unchanged between runs.

The temporary check ran only against well-formed synthetic request records, filenames and byte buffers. The nominal and size-boundary buffers have a PNG-like prefix but are not demonstrated valid PNG images. No real upload, image decoder, parser security check, filesystem upload storage, malware scan, network request, browser or academy-runtime import was performed.

The backslash-name and prefix-only independent learner cases in the lesson were not executed in this creation batch. No student-hardware route, offline transfer process, calibrated marking, accessible delivery, full repository suite or GitHub CI run was validated.

## Curriculum integration boundary
The proposed catalogue adds EH-WEB-09 with direct prerequisite EH-WEB-08; earlier requirements remain transitive and the lesson's actual setup/scope still governs. The proposed catalogue totals become 37 nodes and 65 prerequisite edges. The index adds its reading link. These edits are not a new execution of the repository-wide index, coverage or prerequisite checkers. Rerun those explicit tools against the intended checkout before reporting a new full catalogue validation result. Earlier 36-entry/64-edge reports remain historical, not evidence for this new revision.

No existing capstone scope, runtime, publication flag, home-lab acceptance criterion, Community Learning behavior, evidence-collection route or live service changes. Do not discover all intentionally broken teaching fixtures as ordinary application regressions. A separate local JSON report was generated, not silently committed as CI evidence.
