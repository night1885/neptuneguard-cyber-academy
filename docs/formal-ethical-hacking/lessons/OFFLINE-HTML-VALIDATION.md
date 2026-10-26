# Offline HTML text encoding — author validation

Draft batch: EH-WEB-06, an intentionally unsafe renderer and six visible tests. No browser, server, hosted lab, application runtime integration, publication or Community Learning change is included.

## Executed checks
Executed the supplied renderer and test logic in a temporary directory under Python 3.12.8 using unittest and HTMLParser. The starter exited 1: three tests passed and three failed. The failing tests were test_boundary_is_text, test_entity_like_text and test_markup_is_text. Observations were an extra paragraph start, conversion of entity-like text to a different literal value, and an unintended em element.

A temporary reference repair applied html.escape with quote=True to the supplied text before placing it between the fixed paragraph tags. A fresh interpreter run with bytecode writing disabled passed all six tests and exited 0. The repaired function is not included in the learner starter. These are local author results, not student evidence or repository CI.

## Limits
No browser DOM, script execution, HTTP response, Content-Type handling, framework integration, session, real data or network behavior was tested. HTMLParser is not a complete browser engine. The suite covers only a fixed paragraph text context and selected inputs; it does not prove general XSS prevention. Independent learner additions, supported guest routes, novice usability and accessibility were not validated.

A downloadable JSON authoring record was generated separately and is not automatically a committed artifact.

## Before release
Review the source and context explanation; reproduce on supported guests; validate offline transfer and editor instructions; check the beginner reading bridge; test the independent exercises; calibrate reviewers and private evidence handling; and integrate lesson metadata only through a separate reviewed change. Existing publication gates remain in place. Fixtures must remain outside academy runtime paths.

Source basis:
https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
https://docs.python.org/3/library/html.html
https://docs.python.org/3/library/html.parser.html
