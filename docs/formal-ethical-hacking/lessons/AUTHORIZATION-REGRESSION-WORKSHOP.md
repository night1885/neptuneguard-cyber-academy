# Authorization regression workshop — local teaching model

Optional draft support for [EH-WEB-04](EH-WEB-04.md). Complete its scope, setup, reproduction, repair and policy-derived case work first. This visible supplement is not a substitute for designing your own required cases, an exam answer key, production code or an authorization grant. No prerequisite, compulsory deliverable or pass threshold is added.

## 1. Preserve both allow and deny boundaries
A repair must reject another student's draft without rejecting legitimate owner access. An instructor's course assignment also does not authorize every action in that course. Under this specific EH-WEB-04 policy, students cannot read or edit submitted records; assigned instructors may read them but may not edit them. These are fictional exercise rules, not a claim about academy production policy.

Returning False for every request would block the ownership defect while breaking permitted work. Returning True would preserve permitted work while discarding the boundary. Both are counterexamples to a proper repair. Passing selected tests is not proof of complete authorization enforcement.

## 2. Read the optional supplement before running
Through the same approved material-transfer route, place the reviewed [test_regression_workshop.py](../fixtures/offline-authorization/test_regression_workshop.py) beside your local policy.py and test_policy.py. No package installation, sudo, network access, repository installer or production import is needed. If tools or transfer guidance are unavailable, stop and record the blocker; do not invent a guest setup workaround.

The supplement imports the existing local records and allowed function. It contains six test methods and eight decision examples: instructor edit denied; assigned-instructor submitted read allowed; owner submitted read denied; renamed-owner draft read/edit allowed; same-course nonowner draft read/edit denied; and unassigned-instructor submitted read denied. Two methods each use two action subtests. The renamed labels reduce reliance on the original examples but cannot prove the implementation never hard-codes identities.

Predict each result from the policy before executing. The visible expectations are learning aids and should not be edited just to make a run green. Keep all inputs fictional.

## 3. Run the explicitly named local modules
In the disposable fixture directory, not the repository root, run:

```sh
python3 -B -m unittest -v test_policy test_regression_workshop
result=$?
printf 'combined test status=%s\n' "$result"
```

Save your actual command, output and status. Distinguish assertion failures from a missing executable, syntax error or failed import. The published unmodified base has one method with 12 subtest examples; together with this supplement the runner reports seven methods, covering 20 decision examples. If you added your own cases, totals may differ: document that honestly rather than deleting useful tests to match the author table.

The repository starter deliberately lacks the ownership check and is expected to fail. A passing result is expected only after a correct local repair. No repair is installed into the repository by this workshop.

## 4. Optional counterexample experiment
Preserve your repaired baseline and its successful output first. Use only a fresh disposable copy of the reviewed local fixture files for experiments. Keep the Subject/Submission definitions and test expectations intact. In that scratch copy only, temporarily replace the allowed function body with `return False`, then run the same two-module command. Predict which legitimate decisions will fail. A syntax/import error is not evidence that a policy counterexample was detected.

Restore the repaired baseline in the scratch copy before the next experiment. Optionally repeat with `return True` and predict which forbidden decisions will fail. Discard the counterexample copies afterward; do not promote them into a completed repair, application or shared library. If you cannot safely distinguish the baseline from disposable copies, stop at the reasoning exercise.

A further reasoning question: what happens if an otherwise repaired implementation checks instructor course membership but forgets to restrict the action to read? The author experiment shows that the original visible suite misses this selected regression while the added instructor-edit case catches it. That does not establish that all possible instructor-action defects are covered.

## 5. Record your own observations
| Local version | Predicted affected policy rule | Actual command/status | Actual assertion failures or setup error | Explanation / limit |
|---|---|---|---|---|
| Starter reproduction | | | | |
| Repaired baseline | | | | |
| Optional deny-all scratch copy | | | | |
| Optional allow-all scratch copy | | | | |

Explain why both successful operations and rejected operations belong in a security regression suite. Explain which additional role, action, course, ownership or lifecycle combinations remain untested. Do not claim tests authenticate subjects, retrieve protected data, enforce an HTTP endpoint or isolate a database: this function only returns a Boolean for trusted in-memory test records.

See [the local author validation record](AUTHORIZATION-REGRESSION-VALIDATION.md). Its results are not a substitute for your own guest execution. Full supported-platform reproduction, independent assessment calibration and application-level enforcement remain outside these checks. Catalogue, request budgets, runtime registration, publication and Community Learning remain unchanged.

Source: Python unittest documentation, https://docs.python.org/3/library/unittest.html . The fictional permission policy is defined in EH-WEB-04.
