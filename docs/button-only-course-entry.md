# Button-only read-only course entry candidate

This branch starts from main, not the withdrawn learner-review branch. The protected navigation factory has an explicit buttonOnlyEntry:true option; its compatibility default remains false. The course runtime now selects that option when constructing managed navigation, and the catalog no longer asks learners to enter a permanent ID. This is candidate source behavior only: no merge, deployment or live runtime setting change is included. Other section-login flows are unchanged.

In button-only mode the existing Discord account and active assignment authorize entry. There is no student-ID form, modal submission path, report reader, report writer, consent-history store, saved lesson progress or new database write. Existing enrollment and assignment records are read, not removed or modified. The older enrollment system itself is not claimed identity-free.

Navigation still uses a bounded process-memory grant containing account ID, existing student ID, course, random token and deadline. It expires within the existing five-minute validity limit, is removed by a timer or expiry sweep, and is cleared at disposal; runtime scheduling can delay physical memory cleanup. This is transient identity handling, not zero processing of learner data. No session is persisted or recovered after restart.

The existing card adapter is unchanged. Opening a course creates a separate private response, even when clicked from a private catalog card. Subsequent catalog/page reads on an eligible own private V2 card use deferUpdate and editReply. This is not a claim that the course-open click edits the catalog in place.

The new runtime integration tests exercise the actual course runtime, protected navigation, student renderer and card adapter with a scripted SELECT-only authorization pool. They check mode selection, catalog wording, private course opening, subsequent in-place page navigation and denial after role/assignment loss or copied controls. The navigation factory is injected, so these tests do not exercise live database readiness, managed owner controls, the complete combined-registration stack, or live Discord acceptance. Existing combined-card and runtime regressions are included in the dedicated zero-skip CI job. Results must be checked for each new head.

This branch contains none of PR #63's report-storage changes. No migration, live publication, new enrollment collection, Copilot request, merge or deployment is included.
