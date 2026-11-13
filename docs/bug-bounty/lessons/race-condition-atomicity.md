# Demonstrate a race with exactly two local workers

## Outcome and prerequisites

Explain why a check and its related update must act as an appropriate atomic operation. Complete business-workflow lessons. The executable exercise is local and does not send concurrent requests to any program. Low thread count does not make live financial or stateful concurrency safe or authorized.

Two callers can both observe an available resource before either records consumption. A lock around only the later decrement does not repair a stale earlier check. Idempotency and transaction design are separate concerns; the appropriate repair depends on the authoritative storage and deployment model.

## Local Python procedure

```bash
python3 - <<'PY'
from concurrent.futures import ThreadPoolExecutor
import threading
for fixed in [False, True]:
    state = {'remaining': 1, 'accepted': 0}
    lock = threading.Lock()
    barrier = threading.Barrier(2)
    def consume(_):
        if fixed:
            with lock:
                if state['remaining'] >= 1:
                    state['remaining'] -= 1
                    state['accepted'] += 1
        else:
            observed = state['remaining']
            barrier.wait(timeout=3)
            if observed >= 1:
                with lock:
                    state['remaining'] -= 1
                    state['accepted'] += 1
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(consume, range(2)))
    print('fixed' if fixed else 'unsafe', state)
    assert state['accepted'] == (1 if fixed else 2)
PY
```

Expected unsafe remaining -1/accepted 2; fixed remaining 0/accepted 1. The barrier forces the stale observations before updates. The executor collects worker results, and a barrier timeout propagates as failure rather than being hidden. No exact wall-clock duration is promised.

## Program-based reasoning

From permitted ordinary workflow evidence, identify the resource and invariant, such as one synthetic submission per allowed state. Document whether an operation is reversible, metered, financial or externally visible. Do not use a scanner, synchronized burst or high concurrency to explore it.

A live race test requires explicit applicable program permission and, for consequential state/availability risks, coordination of a small bounded plan and recovery route. If that is unavailable, complete the local exercise and record the hypothesis without execution. The local result does not establish that a remote system is vulnerable.

## Exercise and explained answers

Why not place the barrier inside the fixed lock? The first worker would hold the lock while waiting for a second worker that cannot acquire it. Coordination belongs to the unsafe demonstration, not the repaired critical section.

Is the Python lock a production distributed repair? No. It protects one process's threads, not every server/database/client. Real designs may need transactions, constraints, conditional updates and appropriate idempotency.

Would two 200 responses prove duplicate side effects? No. Inspect the actual permitted state and invariant, accounting for retries and idempotent responses.

## Troubleshooting and cleanup

A timeout or exception is not successful race reproduction. Do not increase concurrency to hide a setup failure. No process, listener or account state is intentionally retained; retain only synthetic output and stop any manually started test process you own.

## Reference and evidence limit

https://portswigger.net/web-security/all-materials

Only two local threads and an in-memory dictionary are used. No live race, load test or financial action is claimed.
