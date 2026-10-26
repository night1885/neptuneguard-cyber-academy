# Selected practical contracts — standalone maintainer runner

Draft maintainer tooling for a trusted reviewed checkout, not a learner grader, sandbox, complete course test, CI activation or release gate. The existing check_authoring.py and its four-module allowlist are unchanged. This separate runner intentionally executes selected teaching fixtures only with explicit --run and the required effect opt-ins.

## What is registered
Eleven entries cover the offline summary, password verifier, ownership/update starters and references, argument/search starters and references, and loopback transport. Offline is the initial six-entry execution profile; those tests may launch local Python CLIs, perform KDF computation and use owned temporary files or in-memory databases. It does not mean no child process. Four shell-helper entries and one actual loopback entry are separately opt-in. The registry is curated selected coverage, not every existing practical or all 37 canonical entries.

The registry stores method count, exit, assertion-failure count/names, errors and skips. It expects zero import/setup errors, skips, unittest expected-failure decorations and unexpected successes. A broken starter may correctly exit 1 and match its specific intended failing assertions. Matching that reproduction contract does not mean the starter is secure. A same-count failure in an unrelated test is rejected.

## Commands and effects
From a trusted repository root with reviewed/provisioned Python (author checked 3.12.8 only), list without executing any teaching fixture:

```sh
python3 -B docs/formal-ethical-hacking/authoring/run_practical_checks.py
```

Listing validates selected metadata shape; it does not establish all fixture directories/selectors exist, load or pass. No arbitrary manifest path, module or target argument is accepted. --only selects registered IDs, not user-supplied Python selectors.

After reviewing and approving the selected local effects, run just the summary example:

```sh
python3 -B docs/formal-ethical-hacking/authoring/run_practical_checks.py --run --only python-summary
```

The following broader commands are instructions for approved full-checkout execution, not claims that they were all executed during this batch:

```sh
python3 -B docs/formal-ethical-hacking/authoring/run_practical_checks.py --run
python3 -B docs/formal-ethical-hacking/authoring/run_practical_checks.py --run --only arguments-reference --include-shell-helpers
python3 -B docs/formal-ethical-hacking/authoring/run_practical_checks.py --run --only loopback-http --include-loopback
```

The last command starts the reviewed short-lived 127.0.0.1 teaching fixture; it needs its own explicit execution permission/setup. It is not permission for another target, NG-Peer or a public bind. Effect flags classify reviewed source; they do not enforce OS/network isolation against changed/untrusted modules. Re-review changed effects. Never run untrusted repository code as a sandbox test or add real credentials/evidence to fixtures.

To check only runner orchestration, from the authoring directory run `python3 -B -m unittest -v test_run_practical_checks`. Its 14 methods use synthetic plans and injected process doubles; they do not launch teaching fixtures. -B is not a sandbox.

## Interpret output
Bare listing exits 0 with listing-only. Execution emits selected-check-contracts-only and per-ID matched_expected_behavior plus expected/observed counts/names; it does not emit raw child stdout/stderr. Overall status 0 means every selected observation matched its registered contract, including intentional reproduction failures. Status 1 means a mismatch, missing directory, launch failure or timeout. Invalid plans/selections/effect opt-ins produce status 2. Zero discovered methods or an absent summary cannot match a positive expected method count.

Each child uses sys.executable, -B, named unittest selectors, list arguments, the reviewed fixture working directory and a 45-second wait limit. No broad discovery or shell command string is used by the runner, but selected fixtures may intentionally use a shell under their approved teaching scope. A wait timeout is not complete descendant cleanup or resource containment. Stop and use the actual recovery process if state is uncertain; do not kill unrelated processes or recursively delete guessed paths.

## Diagnosis, maintenance and limits
On mismatch, inspect the exact selected lesson and rerun its named command in the approved disposable/trusted context to see errors privately. Do not change counts/names simply to hide a defect, overwrite the registry with redirected output, or store learner evidence in these files. Document deliberate reviewed test changes and update expectations together.

Observed text follows selected unittest output conventions checked on Python 3.12.8. A maintained source/plan can change meaning even when counts match; this is not anti-tamper grading or proof of semantic coverage. Trusted-checkout/source review remains essential. No hardware, learner workflow, private storage, lab authorisation, assessment calibration, certification alignment or production security is established. Read [execution scope](PRACTICAL-CHECK-VALIDATION.md) before claiming this entire registry has run.
