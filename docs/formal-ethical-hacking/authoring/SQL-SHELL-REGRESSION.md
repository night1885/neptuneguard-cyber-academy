# SQL lesson shell example — correction and regression record

Draft authoring correction only. The current EH-WEB-05 lesson was read from the formal course branch before proposing the change. Its status-printing line contained over-escaped quotes and newline text, and the code fence was not preceded by the intended real line break. The update restores a normal Bash printf line and a separately closed fence. It also distinguishes a SQL test error from an assertion failure and explains the final printf command's status.

## Local checks
The affected shell block was reproduced in a temporary test-only lesson wrapper with the same directory shape expected by the new regression file. A Bash function replaced python3, verified the unittest arguments and returned either 0 or 7. Both tests failed against the old shell text and passed against the corrected text. A separate byte inspection confirmed that the corrected status line ends with an actual newline.

The tests read the lesson's first sh code block and execute that block using Bash with the unittest invocation mocked. They check printed status, final command success and absence of stderr. They do not execute query_lab.py, perform the SQL practical, contact a network or validate student hardware. This authoring session did not reconstruct a complete repository checkout or run GitHub CI.

## Safe maintainer use
These tests execute reviewed repository shell text. A temporary working directory and timeout are not a security sandbox: never run the test on untrusted lesson edits or assume the mock prevents arbitrary other commands in a changed block. Review source changes first and use an appropriately isolated maintainer environment.

From docs/formal-ethical-hacking/authoring run `python3 -m unittest -v test_sql_shell_example`. Bash is required; an unavailable Bash causes explicit skips, which are not validated coverage. Repository-wide test discovery remains inappropriate for the intentionally failing learner fixtures.

## Unchanged boundaries
The SQL fixture intentionally remains vulnerable for learning. The reference repair is not installed by this change. Publication gates, course permissions, hosting, runtime, Community Learning, navigation and grading remain unchanged. Full supported-guest reproduction, content review and assessment calibration are still pending.

A downloadable local regression record was generated separately and is not automatically committed as CI or learner evidence.
