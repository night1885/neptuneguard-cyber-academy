# Read client-side code and source maps within program limits

## Outcome and prerequisites

Learn how browsers use source maps and how client code can reveal routes and configuration questions. Complete the browser-network lesson. Read only files your normal browser session loads from permitted assets. Do not download source archives or request guessed map files as a scanning shortcut.

Chrome DevTools can load source maps so that the Sources panel shows authored files while the browser runs the minified code. A sourceMappingURL comment in a deployed file identifies the associated map.

## Browser procedure

1. Open DevTools on a permitted page and enable JavaScript source maps in Settings, Preferences, Sources.
2. In Network, filter by JS and record the normal files loaded.
3. In Sources, check whether DevTools reports a source map and whether authored files are listed.
4. Search loaded code for route names that the page already calls, such as API path prefixes. Record only their names.

## Local note-taking exercise

```bash
python3 - <<'PY'
import re
sample = "fetch('/api/v2/notes'); // sourceMappingURL=app.js.map"
routes = re.findall(r"/api/[A-Za-z0-9_/-]+", sample)
maps = re.findall(r"sourceMappingURL=([^\s]+)", sample)
print('routes:', routes)
print('map reference:', maps)
PY
```

Expected: one route and one map reference. This regex is a note-taking aid, not a reliable parser.

## Handling findings

A route in JavaScript is a lead, not permission to request it; return it to the inventory and scope review. If you see an apparent key or token, do not test it against any service. Record file and line context, redact it and use the program's reporting process only if the program treats it as in scope. Public client identifiers are often intended to be public.

## Exercise and answer

A source map exposes original comments. Is that automatically reportable? No. Check whether the program accepts source-map exposure and whether any sensitive data appears.

## Troubleshooting and cleanup

Minified code and dynamic loading can hide routes. Do not execute extracted code outside the browser. Clear stored files that contain secrets.

## Sources and validation limit

Chrome DevTools source-map documentation. The regex example is local; no live JavaScript was inspected.
