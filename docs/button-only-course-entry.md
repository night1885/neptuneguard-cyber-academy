# Button-only read-only course entry candidate

This branch starts from main, not the withdrawn learner-review branch. It adds an explicit buttonOnlyEntry:true option to the existing protected navigation factory. The compatibility default is false; runtime selection is not changed or deployed by this commit. A subsequent routing change must be separately reviewed before claiming that live learners no longer encounter the legacy student-ID modal.

In button-only mode the existing Discord account and active assignment authorize entry. There is no student-ID form, modal submission path, report reader, report writer, consent-history store, saved lesson progress or new database write. Existing enrollment and assignment records are read, not removed or modified. The older enrollment system itself is not claimed identity-free.

Navigation still uses a bounded process-memory grant containing account ID, existing student ID, course, random token and deadline. It expires within the existing five-minute validity limit, is removed by a timer or expiry sweep, and is cleared at disposal; runtime scheduling can delay physical memory cleanup. This is transient identity handling, not zero processing of learner data. No session is persisted or recovered after restart. The generic payload/card adapter still determines supported in-place editing behavior.

Tests use scripted SELECT-only authorization and Discord interactions. They do not prove live Discord acceptance or database role configuration. The read-only renderer and existing authorization checks remain in place. This branch contains none of PR #63's report-storage changes. No migration, live publication, new enrollment collection, Copilot request, merge or deployment is included.
