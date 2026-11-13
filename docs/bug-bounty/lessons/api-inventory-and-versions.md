# Build an API inventory from permitted observations

## Outcome and prerequisites

Create an evidence-based list of API versions, hosts and purposes without guessing or scanning. Complete mapping, browser-network and authorization lessons. Use documented and observed routes only. Mapping an API is not permission to test every version or host.

OWASP's API risk list includes improper inventory management, because old, undocumented or nonproduction versions can retain weaker controls. Inventory work asks what exists, which version it is, who documents it and whether it is covered by the program. It does not require calling every route.

## Offline inventory exercise

```bash
python3 - <<'PY'
import json
observed = [
    {'host': 'api.example.invalid', 'path': '/v2/notes', 'source': 'documentation', 'in_scope': True},
    {'host': 'api.example.invalid', 'path': '/v1/notes', 'source': 'script reference', 'in_scope': None},
    {'host': 'beta.example.invalid', 'path': '/v2/notes', 'source': 'archived export', 'in_scope': False},
]
for item in observed:
    item['candidate_for_scope_review'] = item['in_scope'] is True
    print(json.dumps(item, sort_keys=True))
PY
```

Expected: only the first record is a scope-review candidate. Unknown scope remains unknown. Even a positive scope match does not establish permitted methods, identities, traffic limits or testing authority. This model reads no files and sends no request.

## Program-based procedure

1. Start with the brief, public API documentation and what the application normally calls in permitted use.
2. For each item, record host, base path, version, auth type, source, date and scope confidence.
3. Compare versions only by documented or already-observed behavior. Do not append guessed version numbers or probe common paths.
4. Mark deprecated, beta and staging-like names as questions, not targets. Names do not establish ownership or permission.
5. Use the support route to clarify unclear scope. Choose a single permitted route for a later authorization comparison.

## Exercise and explained answers

A script mentions /v1/notes. May you request it? Not from the reference alone. Establish explicit coverage and method permission first.

Why record source and date? Inventory entries become stale, and provenance affects confidence and later reports.

## Troubleshooting and cleanup

Duplicate hostnames, redirects and CDN aliases can create false distinctions. Do not resolve unknown names merely to complete the table. Keep private maps in approved private storage.

## Source and validation limit

https://owasp.org/API-Security/editions/2023/en/0x11-t10/

The executable inventory is synthetic and offline. No API was called.
