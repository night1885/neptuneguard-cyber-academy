# Test limits by reasoning, not by exhausting services

## Outcome and prerequisites

Explain how request rate, response size, expensive operations and automation can create resource-consumption risk, while avoiding real denial-of-service activity. Complete read-program-brief.md, build-a-scope-allowlist.md, business-workflow-invariants.md and race-condition-atomicity.md first. This lesson comes before httpx-bounded-probing.md, katana-bounded-crawling.md, ffuf-bounded-content-discovery.md and nuclei-bounded-templates.md; no automation lesson is a prerequisite here. Many programs prohibit load, denial of service and brute force. Absence of a rule does not authorize traffic bursts.

OWASP lists unrestricted resource consumption as a distinct API risk. A report should concern a controlled and permitted observation, not an attempt to prove maximum damage. Many limits are about cost, quotas, uploads, pagination, search complexity or background work rather than raw request count.

## Offline simulation

```bash
python3 - <<'PY'
def limit(requests, ceiling):
    accepted = min(requests, ceiling)
    return accepted, requests - accepted
for requests in [3, 5, 8]:
    print(requests, limit(requests, 5))
PY
```

Expected: 3 accepted/0 rejected; 5/0; 5 accepted/3 rejected. This arithmetic simulates a limit and sends no traffic. It does not model time windows, distributed counters or authentication.

## Program-based approach

Read documented limits, quotas, error responses and automation rules. If a normal workflow reveals pagination or limit parameters, observe their documented defaults. Do not alter page sizes to extreme values, generate repeated searches or upload large files. If a limit is relevant, ask whether the program permits one carefully bounded comparison and what request count is acceptable.

Stop on 429, quota warnings, latency spikes or errors. Record the response and time, then pause. Do not retry from multiple IP addresses, accounts or tools. Do not create concurrency to bypass a limit.

## Exercise and explained answers

You see no rate-limit header. Is the API vulnerable? No. Headers are optional and enforcement may be elsewhere. Without permitted evidence, record an observation only.

Why avoid increasing page size sharply? It can consume resources and retrieve unrelated data. A small documented comparison is enough to understand parameter behavior.

## Troubleshooting and cleanup

If a service slows, stop and wait. Close sessions, note the final state and use the support channel if you suspect impact. Do not continue to measure.

## Source and validation limit

https://owasp.org/API-Security/editions/2023/en/0x11-t10/

The code is arithmetic only. No request, load or concurrency was executed.
