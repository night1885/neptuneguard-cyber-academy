# Offline path containment — local author validation

Draft batch: EH-WEB-07, a deliberately flawed standalone path resolver and seven visible tests. No hosting, publication, academy-runtime import, production or Community Learning change is included.

## Executed checks
Executed in the authoring sandbox on Linux with Python 3.12.8. Each test created and cleaned its own temporary workspace. Test data and symbolic-link targets stayed within that workspace. The resolver inspected paths but did not read their contents; the test setup wrote only its synthetic files.

The starter exited 1. Five tests passed; test_sibling_prefix and test_symlink_to_sibling failed because the expected ValueError was not raised. No tests were skipped.

A temporary reference repair replaced the resolved-path string-prefix comparison with candidate.is_relative_to(base), leaving strict resolution and the absolute-input rule intact. In a fresh interpreter run with bytecode writing disabled, all seven tests passed with no skips. The repair is not included in the learner starter. These are author checks, not student evidence, repository CI or a release approval.

## Limits
No student VM, Windows/macOS compatibility, race condition, concurrent attacker, hard-link policy, mount change, URL decoding, HTTP layer or real file-serving application was tested. The model accepts existing paths under a stable base and does not check ownership, authorization or file type. Passing these tests does not establish production-safe file access.

The learner's independent additions, novice workflow, offline transfer route and accessibility have not been validated. A downloadable JSON author record was generated separately and is not automatically a repository artifact.

## Release checks
Reproduce as a normal account on each supported guest; record symlink skips honestly; validate the Python API prerequisite; review temporary-file cleanup and safe material transfer; test the independent cases; calibrate reviewers and private evidence handling; and register metadata through a separate reviewed change. Keep the fixture outside academy runtime paths. Existing publication and authorization gates remain unchanged.

Source basis:
https://docs.python.org/3/library/pathlib.html
https://community.owasp.org/attacks/Path_Traversal
