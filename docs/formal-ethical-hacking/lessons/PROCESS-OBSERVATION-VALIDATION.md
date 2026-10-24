# Linux process observation — local author validation

Draft batch: EH-LINUX-04, EH-LINUX-05 and a blank worksheet. No academy-runtime, hosting, publication, system-service or Community Learning change is included. New lessons are not automatically added to the earlier reading-route index or runtime metadata by this batch.

## Executed local checks
On the Linux authoring sandbox, a noninteractive Bash command started a single Python child sleeping for 30 seconds, immediately saved $!, displayed PID/PPID/STAT/ETIME/COMM through a narrow ps selection, sent TERM to that just-created child and collected its status with wait. The observed child status was 143. A subsequent narrow ps invocation returned no matching row and status 1 at that moment.

A separate short Python child exited naturally and wait returned 0. Both enclosing author checks completed. The observed state before termination was R; no particular sleeping-state letter is required for a valid early snapshot. The PIDs are intentionally omitted because they are transient and must never be reused by learners.

The learner guide uses a 120-second natural lifetime to allow reading and interactive inspection. That full interactive workflow, jobs display and human verification steps were not reproduced by the shorter noninteractive author checks. The guide must not claim exact end-to-end execution on this basis.

## Not tested
No socket, ss command, HTTP fixture, two-VM process correlation, service manager, guest image, non-root classroom configuration, privilege boundary, PID-reuse race or supported-platform matrix was tested. Signal statuses and output details must be recorded on the actual supported environment. A short process check is not CI or release approval.

A downloadable JSON author record was generated separately and is not automatically a committed artifact or student evidence.

## Before release
Reproduce the full ordinary-account interactive process exercise and listener comparison on supported guests. Verify Bash/ps/ss behavior, premature expiry and missing-tool paths. Review minimal evidence, actual support routes, accessibility and safe cleanup. Calibrate assessment and add navigation/metadata only through a separately reviewed update. No force-kill, system-service changes or permission escalation should be introduced as a workaround.

Source basis:
https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html
https://www.man7.org/linux/man-pages/man1/ps.1.html
https://man7.org/linux/man-pages/man8/ss.8.html
