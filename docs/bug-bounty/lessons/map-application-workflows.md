# Map application workflows before testing

## Goal and prerequisites

Turn permitted observations into a small map of identities, objects and state transitions. Complete the program-brief and HTTP lessons. Mapping is not permission to request every discovered route. Use ordinary allowed navigation and already-permitted artifacts; do not begin with a recursive crawler.

## Explain the application, not just its URLs

A route inventory tells you where behavior may occur. A workflow map adds who acts, what object changes, what state is required and what success means. For a draft application, creating, viewing, submitting and approving are separate operations. A student owning a draft need not be an approver. Record expected rules as hypotheses until supported by documentation or observation.

For every observation preserve source and date. A JavaScript reference can be stale, an archived hostname can be retired and a linked vendor can be out of scope. Separate observed, inferred and unverified entries. Do not transform an inventory into an automatic target list.

## Offline inventory exercise

This Python example performs no DNS or HTTP activity:

```bash
python3 - <<'PY'
observations = [
    ('Portal.Example.Invalid', '/drafts', 'brief'),
    ('portal.example.invalid', '/drafts', 'saved navigation notes'),
    ('old.example.invalid', '/admin', 'historical export'),
]
inventory = {}
for host, path, source in observations:
    key = (host.lower().rstrip('.'), path)
    inventory.setdefault(key, set()).add(source)
for key, sources in sorted(inventory.items()):
    print(key, sorted(sources))
PY
```

Expected: two entries, with two provenance sources retained for the portal route. Only hostname case is normalized; paths may be case-sensitive. Deduplication saves repeated analysis but establishes neither ownership nor authorization.

## Program-based procedure

1. Select one permitted workflow and account. Review navigation, account creation and automation restrictions.
2. Use the normal UI only within that plan. Browser visits can generate subrequests and third-party traffic; check routing and actual destinations.
3. In Developer Tools Network or Burp history, associate relevant requests with the user action that initiated them. Do not request newly discovered destinations automatically.
4. Privately record action, identity, object type, method, state before/after, endpoint source and confidence. Exclude tokens and unrelated response data.
5. Draw one expected allow and one expected deny relationship. Plan validation separately; observation is not approval to modify traffic.

## Exercise and explained answers

A script references an older API hostname: is it available for testing? Not from that reference alone. Check current explicit coverage and method permission.

Why keep the raw source? Normalization may merge superficially similar items or remove context. Preserve provenance and avoid lowercasing arbitrary paths or opaque identifiers.

## Troubleshooting and cleanup

An empty map may mean a static view or a missed filter, not absence of APIs. Do not compensate by broad scanning. Keep confidential maps private and remove only your permitted synthetic records if any were created.

## Reference and evidence limit

https://owasp.org/www-project-web-security-testing-guide/

The code is an offline inventory exercise. No real workflow or target request is claimed as executed.
