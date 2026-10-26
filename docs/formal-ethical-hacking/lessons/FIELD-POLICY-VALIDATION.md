# Offline field policy — local author validation

Draft batch: EH-WEB-08, a deliberately flawed dictionary update mapper and eight visible tests. No API, database, hosting, production, application-runtime integration, publication or Community Learning change is included.

## Executed checks
Executed the supplied fixture and tests in a temporary authoring directory under Python 3.12.8. The starter exited 1: three tests passed and five failed. The failed tests were owner rejection, grade rejection, state rejection, whole-operation rejection for mixed input and rejection of an unknown field. Expected ValueError exceptions were not raised.

A temporary reference repair checked the supplied key set against exactly title and body before building the return dictionary. In a fresh interpreter run with bytecode writing disabled, all eight visible tests passed and the process exited 0. The repair is not included in the learner starter.

## Limits
These checks cover a flat in-memory mapper and selected examples. They do not validate HTTP parsing, schemas, authentication, object authorization, nested updates, value limits, database transactions, concurrency or a real API. Whole-operation rejection here is not a database atomicity guarantee. No student-guest execution, novice walkthrough, independent learner cases, grading calibration or accessibility review was performed.

A downloadable JSON author-check record was generated separately and is not automatically a repository or CI artifact. These results are not student evidence or release approval.

## Before release
Reproduce on supported student guests; review the flat-data assumptions and exact error policy; validate transfer/editor instructions and beginner comprehension; execute independent cases; calibrate assessment and private evidence handling; and register course metadata through a separate reviewed integration. Keep all teaching fixtures outside academy runtime paths. Existing release and authorization gates remain unchanged.

Source basis:
https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html
