# Reason about cache keys without poisoning shared caches

## Outcome and prerequisites

Understand why two requests may or may not receive the same cached response and why a mistake on a live shared cache can reach real users. This lesson is reasoning and offline practice first. Do not attempt cache poisoning or private-content caching on a real program unless its current rules explicitly allow the exact method and an isolated unique cache key.

A cache decides equivalence using a cache key, commonly including the request line and Host header. Components outside the key are unkeyed. PortSwigger explains that poisoning needs an unkeyed input to influence a response that is then cached for matching requests. Web cache deception is different: private dynamic content is cached under a path another request can retrieve. Both depend on cache and origin disagreeing.

## Offline model

```bash
python3 - <<'PY'
cache = {}
def origin(path, forwarded_host):
    return 'link to ' + (forwarded_host or 'portal.example.invalid') + path
def request(path, forwarded_host=None, keyed=False):
    key = (path, forwarded_host if keyed else None)
    if key not in cache:
        cache[key] = origin(path, forwarded_host)
    return cache[key]
first = request('/home', 'synthetic.example.invalid')
second = request('/home')
print('unkeyed header reused:', first == second, second)
cache.clear()
first = request('/home', 'synthetic.example.invalid', True)
second = request('/home', None, True)
print('keyed header separated:', first != second)
PY
```

Expected: the unkeyed example is reused with the synthetic host, then separation is True. This toy cache has no TTL, authentication or CDN behavior and sends no request.

## Safe live observation

Read the program rules first. Observe cache-related headers only on a public static resource the program permits you to request. Record status, Cache-Control, Age and Vary when present. A missing indicator does not prove no cache exists, and a header name does not prove configuration.

If deeper work is expressly permitted, plan a unique cache-buster so only your request can match, a harmless marker and a cleanup route. Do not use a popular page, private content, a scheduled loop or a header guesser against a live shared cache without explicit allowance. The risk is that your response reaches real users.

## Exercise and explained answers

Why is a unique cache key important? It reduces the chance that a test response is served to others. It does not remove the need for permission or minimal activity.

Does Cache-Control: private prove no sensitive caching problem exists? No. Intermediaries, path rules and application behavior can differ. Describe what you observed.

## Troubleshooting and cleanup

Short TTLs, missing Age headers and varying edge nodes make results inconsistent. Do not repeat requests to beat the cache. Stop on unexpected user data or suspected shared poisoning and use the program's designated route.

## Source and validation limit

https://portswigger.net/web-security/web-cache-poisoning

No live cache request was made. Only the toy dictionary model is executed.
