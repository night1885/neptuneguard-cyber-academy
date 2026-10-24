# Executable-search boundaries — selected local checks

Draft record following 76b2c53714876b3b6b56f046fc8209e88e4674ed. Local Python 3.12.8, POSIX same-identity child processes and fixed inert helpers in fresh temporary directories. No real privilege escalation, identity switch, SUID/capability/service modification, personal file, global PATH change, network or academy runtime.

| Selected suite | Methods | Assertion failures | Test errors | Exit |
|---|---|---|---|---|
| PATH-dependent starter | 12 | 1 | 0 | 1 |
| Explicit-path reference | 12 | 0 | 0 | 0 |
| Exact CLI reports/argument contracts | 2 | 0 | 0 | 0 |
| Reference plus CLI | 14 | 0 | 0 | 0 |

The same boundary requirements are reused for starter/reference, not independent duplicate coverage. Selected checks include both search orders, spaces in a generated workspace, child status versus marker, changed source/extra entry/symlink/mode rejection before launch, order type, caller PATH preservation, nonempty preparation and unsupported-runtime rejection. No full executable-trust or effective-permission engine is implemented.

Both fixed helpers returned status zero in the selected demo cases. The starter's other-first order selected the other known marker; the reference selected the intended marker in both orders. CLI methods execute both exact script names from unrelated temporary working directories and verify summaries/statuses and extra-argument rejection with empty stdout/status 2.

The fixture changes modes only on its newly created helper files. Tests create/change only owned synthetic entries. Helpers use a known /bin/sh shebang and printf of fixed text; shell=False therefore does not mean absence of any interpreter. File/layout checks have race and trust limitations and are not a production containment boundary.

Not established: supported student hardware/guests, all filesystems/no-exec behaviour, alternate OS/shell/interpreter platforms, actual lower-versus-higher privilege control, general environment/dependency security, hostile concurrent filesystem changes, interrupted cleanup, accessibility execution, independent assessment calibration, full repository suite or GitHub CI. Canonical catalogue/prerequisites, existing execution/network scopes, runtime/publication, Community Learning and learner state remain unchanged. This begins executable-search reasoning for K09, not completion of Linux privilege escalation.
