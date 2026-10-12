# Application shutdown controller — not installed yet

This patch prepares a shutdown controller and seven mocked tests. It does not modify index.js, install process signal handlers, exit the real application, or change current shutdown behavior. Its new test file is covered by the existing certification CI glob. Results for this patch are pending at preparation time.

The controller is inert until install() or shutdown() is called. Explicit installation registers one listener each for SIGINT and SIGTERM. Repeated signals or shutdown calls share one shutdown operation. Normal ordering is stop admission, drain academy handlers and detach certification in parallel, close the academy pool, then destroy Discord and exit zero. Cleanup errors are sanitized and other steps continue, ending with a nonzero exit.

A default 15-second watchdog exits nonzero if shutdown stalls. A forced exit is not proof that any in-flight write failed or rolled back. Operators must inspect persisted enrollment status before retrying uncertain actions. The controller cannot cancel remote database work or promise network delivery. Real exit defaults to process.exit; tests inject fake exit callbacks and fake signal emitters. No real process signals are emitted by the tests.

Entry-point integration remains required: retain the certification runtime handle; synchronously block new academy work before draining; track every relevant academy interaction and database initialization task; supply detachCertification as runtime.detach; supply academy pool closure and Discord destruction; install only after successful setup; and route login/startup failures through the same reviewed cleanup path. Do not represent an untracked academy listener as drained.

Live shutdown and restart testing, uncertain-outcome checks, least-privilege database credentials, TLS review, and final security review remain outstanding. This patch does not migrate, publish, merge, deploy, or enable enrollment.
