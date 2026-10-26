# Application-ownership bridge — selected local execution

Draft record following source commit 388f6be10ce6724036b7b698f010755fbcf2957f. Python 3.12.8, temporary author directories, in-process WSGI calls and in-memory SQLite only. No listener, socket request, real identity, credential, academy database, student guest, full repository suite or CI.

| Suite | Methods | Assertion failure events | Test errors | Exit |
|---|---|---|---|---|
| Deliberately defective starter | 20 | 4 | 0 | 1 |
| Repaired reference | 20 | 0 | 0 | 0 |
| CLI contracts | 2 | 0 | 0 | 0 |
| Reference plus CLI | 22 | 0 | 0 | 0 |

The same 20 application expectations are inherited by the reference tests with a different trusted factory, not independent duplicate coverage. Four starter assertion failures concern nonowner decision/body/HEAD/unknown-record consistency under the omitted ownership condition. The corrected reference preserves positive owner/instructor cases and the existing course/state restrictions. The selected method contract also checks Allow on 405.

CLI tests execute exact script names from unrelated temporary working directories, assert report presence and expected starter/reference status and summary, and verify both extra-argument rejections with status 2/empty stdout. Demo reports omit the private fictional note text; response-level tests inspect invented bodies directly. The dependency-error test drops only its own in-memory notes table to exercise a generic 503.

Trust limit: ng.actor and its fields are supplied by the harness, not authenticated. setup_testing_defaults creates fake WSGI values for testing and must not be used as production identity/server setup. One allowed exchange is wrapped with wsgiref.validator; this is not exhaustive protocol conformance or application security verification. No actual HTTP framing, TLS, browser behaviour, client/server proxy, login/session or real database isolation was tested.

Additional unresolved work includes hostile-input bounds, complete response/timing/privacy analysis, operational logging, concurrency/lifecycle transactions, actual authentication and authoritative adapters, original unfamiliar application assessments, supported guest/media/transfer, accessibility and assessor calibration. The fixed fixture must remain outside academy runtime. Canonical catalogue/prerequisites, publication, Community Learning and learner state remain unchanged.
