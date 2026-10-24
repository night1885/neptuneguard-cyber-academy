# Command-argument boundaries — teaching exercise

Draft K08/K06 support, not a canonical lesson. This fixture is deliberately unsafe in its starter form. Use only the fixed labels in the reviewed fixture, in a disposable POSIX guest. Do not deploy the unsafe starter, import it into academy runtime, or pass user-supplied commands to it.

## Predict
Before running anything, predict whether the label `demo; printf FICTIONAL_MARKER > proof.txt` will be preserved as one literal argument or interpreted as shell instructions.

## Observe the starter
In a new empty disposable directory, run the reviewed starter and tests. Record actual status, failing assertion names and whether `proof.txt` appears. Expected starter result: 3 failure events and exit status 1. Do not change expected values to make the starter pass.

## Repair
Compare the starter with the repaired reference. The repair passes arguments as a list with `shell=False` and keeps the label literal. Rerun the same tests. Expected repaired result: 12 methods, no failures and exit status 0.

## Explain
Explain why string construction for a shell creates a boundary problem, why `shell=True` changes parsing, and why a boundary test must check both legitimate and rejected inputs. Describe what this exercise does not prove: it does not authorise any external target, validate a web application, or establish a complete command-injection defence.

## Limits
All values are fixed and invented. The exercise runs only a known Python worker in a test-owned directory. No network operation, privilege change, real data, academy submission or production command handling is included.
