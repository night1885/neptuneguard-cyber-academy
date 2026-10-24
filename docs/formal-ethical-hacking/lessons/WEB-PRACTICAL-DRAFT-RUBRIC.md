# Offline web practical — draft transparent rubric

Proposed review aid for EH-WEB-PRACTICAL-CAPSTONE. Not approved for grading, publication, automated decisions or awards. It contains no protected model solutions or individual student results.

## Purpose and scoring proposal
Evaluate reasoning and evidence alongside functional repair. Five dimensions are proposed, each scored 0 through 3 for a possible 15 points. These are design choices for calibration, not externally validated thresholds. No pass score is set. A numerical total must not replace qualitative review of scope, privacy or incomplete execution.

### A. Boundary and policy reasoning
0: No usable explanation or materially incorrect conflation of boundaries.
1: Recognizes some symptoms but cannot trace inputs to decisions or transformations.
2: Correctly explains the main boundaries, with minor gaps or unsupported assumptions.
3: Clearly distinguishes policy, SQL structure and HTML text context, identifies trusted assumptions and states limits.

### B. Baseline evidence and reproducibility
0: Execution evidence absent, fabricated or unusable.
1: Partial output without enough context to identify what ran.
2: Genuine relevant baseline evidence with mostly reproducible environment and steps.
3: Concise, traceable evidence distinguishes predictions, assertions, runtime errors, fixture versions and counting units.

### C. Repair quality
0: No meaningful repair or the result is achieved by changing expectations or disabling functionality.
1: Partial repair or unexplained special-casing with important regressions.
2: Principled repair that preserves tested legitimate behavior, with minor explanation gaps.
3: Minimal defensible changes, clear rationale, intact visible expectations and explicit residual limitations.

### D. Regression and independent testing
0: No credible rerun or no connection between tests and policy.
1: Reports only a green summary, with weak explanation or no independent case.
2: Reports genuine unchanged-suite results and relevant added cases, with limited analysis.
3: Predicts and executes meaningful independent cases, distinguishes tested from untested behavior and explains why finite tests do not prove complete security.

### E. Reporting and responsible scope
0: Report is unusable or materially misrepresents the exercise.
1: Some useful content but unclear claims, evidence links or privacy handling.
2: Clear bounded report with minor omissions.
3: Accurate claims linked to evidence, synthetic data only, explicit exclusions, honest final state and a useful authorized handoff.

## Important review distinctions
A blocked run is not a successful practical, but it may demonstrate useful diagnosis. Record it as incomplete where appropriate; do not invent a score conversion or penalize a supported accessibility need under an unfinished policy.

A passing visible suite is not by itself proof of originality, independent mastery or secure deployment. Review the explanation and independent case. A good report cannot substitute for missing execution where execution is required.

Suspected fabrication, exposed secrets or scope violations require the actual incident/assessment process. Do not quietly resolve them with a point deduction, publish learner allegations or invent disciplinary rules.

## Calibration before use
1. Approve the policy, learning outcomes, accommodations and private evidence handling.
2. Prepare synthetic benchmark submissions representing strong, partial, blocked and misleading work. Keep protected solutions in the eventual restricted instructor system, not this repository.
3. Have at least two reviewers independently apply the rubric to the same samples.
4. Compare dimension scores and reasons; reconcile disagreements and revise ambiguous descriptors.
5. Pilot with representative learners and verify that the instructions and evidence requirements are feasible.
6. Set pass/reassessment rules and approval authority only after this review. Do not claim accreditation or predictive validity from a small pilot.

## Current state
No benchmark set, inter-reviewer calibration, learner pilot or formal scoring has been completed by authoring this file. The full capstone has not been executed end to end. Existing release gates remain unchanged; no runtime grading, learner access or award is created.
