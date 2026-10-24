# Bounded synthetic authorization — offline wrapper

Standalone prototype utility and tests, not a production identity/authorization adapter. Never import into academy runtime. Existing workspace, review, controls and journey files are unchanged; their default behavior is not automatically wrapped by adding this module. Only the new tests explicitly inject guard.authorize into the synthetic review model.

## Named local test
From this directory in a trusted checkout with Node available:

```sh
node --test authorization.test.mjs
```

The wrapper imports only node:perf_hooks; the tests also import the existing review.mjs. Its previously retrieved source matched Git blob c685401e32f9a365c65aa072fcc92d22bee3cb93 during local reconstruction. No package installation, network call, database or Discord SDK is used.

## Behavior actually implemented
Only a check returning the primitive true before the monotonic deadline can resolve as allowed. Other values, throws, rejections, deadline expiry, disposal and excess pending work resolve false. A timer supplies asynchronous timeout handling; performance.now checks the deadline again on completion so a late synchronous result is denied when execution resumes. No exception message or underlying diagnostic is returned by this Boolean interface.

The default deadline is 50 milliseconds and the default outstanding-work cap is 20, with tightly bounded constructor options for this demo. These are prototype parameters, not approved production service limits. The wrapper does not inspect a user's identity or enforce course/lab assignment by itself. Its result is only as authoritative as the injected check and trusted calling context, neither of which is implemented here for real users.

A timeout settles the caller's result as false but does not cancel the underlying check. That unresolved check continues occupying a pending slot until it actually settles. Capacity is not reset by a timer while work remains outstanding; this bounds admitted callbacks and can intentionally deny future work when a backend is stuck. Disposal denies pending/future callers and clears response timers, but it cannot terminate already running backend work. pendingCount reports remaining underlying jobs, not unresolved caller responses.

The helper cannot interrupt blocked JavaScript or guarantee a hard response-time bound. Timer callbacks need the event loop to run. The deadline check prevents a late true from becoming an allow result after execution resumes; it does not preempt a synchronous infinite loop or undo backend side effects. A real dependency needs its own reviewed cancellation, timeout and resource-control design.

## Executed local checks
Eleven top-level tests passed locally on Node v20.20.1, zero failed and zero skipped. Some contain multiple values/assertions; those are not additional top-level tests. Cases cover primitive true, non-true values, synchronous/asynchronous errors, timeout with outstanding accounting, capacity without starting extra work, disposal, constructor limits, late draft authorization, timed-out submit with a queued read, disposal before a second create authorization completes, and delayed synchronous completion.

The model tests show that a timed-out asynchronous authorization does not create a draft or mutate a submitted revision later when the callback resolves true. One test confirms that a queued read completes after the denied submission, and another confirms that the full 20-record capacity remains available after the timed-out draft attempt. These are in-memory model observations, not database transaction or distributed revocation guarantees.

The late synchronous test deliberately blocks its test process briefly with Atomics.wait; it verifies denial after execution resumes rather than timely timer delivery. No live backend is blocked. The prior 44 prototype tests were not rerun in this batch. A separate local JSON report was generated, not silently committed as CI evidence.

## Still outside scope
No real trusted identity, private message, reviewer assignment, exercise scope, evidence upload, durable state, rollback/restart recovery, audit, retention or deployment is implemented. Caller input validation, mutation timeouts, page-loader timeouts, hostile JavaScript objects, production availability and interactions across multiple processes remain separate work. The wrapper must not be used to claim cancellation of a mutation that already started.

The root application, combined maintainer runner, architecture manifest, runtime integration/publication flags, Community Learning, learner records, external services and databases remain unchanged.
