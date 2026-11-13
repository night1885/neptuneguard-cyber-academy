# Inspect JSON and preserve trustworthy evidence

## Outcome and prerequisites

Read a small JSON response, select relevant fields and explain what a comparison establishes. Use Python 3 or optional jq on your own workstation. This lesson's executable examples use fabricated local data only; no request, login, program submission or external upload occurs.

## Why JSON tools matter

An API response is data, not shell code. Parsing it can distinguish a real object from an HTML login page or an error document. Pretty-printing validates syntax, not truth, provenance, schema correctness or authorization. A response containing id and owner fields does not prove those fields match a server-side security policy.

Retain raw permitted evidence separately from transformed excerpts. A normalizer can hide differences or change representations; a projection can omit the very field needed to explain a failure. Never pipe extracted values into sh, bash or eval. Field names and values from a service are untrusted input.

## Create a fresh synthetic workspace

These Bash commands create a new private directory and two small files. They do not modify the previous session directory:

```bash
umask 077
JSON_DIR="$(mktemp -d "$HOME/bug-bounty-json.XXXXXX")"
cd -- "$JSON_DIR"
cat > owner.json <<'JSON'
{"id":"demo-1","owner":"A","title":"Synthetic draft","meta":{"request":"one"}}
JSON
cat > comparison.json <<'JSON'
{"id":"demo-1","owner":"A","title":"Synthetic draft","meta":{"request":"two"}}
JSON
python3 -m json.tool owner.json
```

Expected: a formatted object with four top-level keys. The original files remain unchanged. File parsing can fail for invalid syntax; an HTML error page is not a JSON schema change.

## Optional jq workflow

Obtain jq through the official project or an approved package repository. Inspect your installed version and help; the online manual can describe a newer release.

```bash
jq --version
jq --help
jq '{id, owner, title}' owner.json
jq -r '[.id, .owner, .title] | @tsv' owner.json
jq -e 'type == "object" and has("id") and has("owner")' owner.json
jq -S '{id, owner, title}' owner.json > owner.selected.json
jq -S '{id, owner, title}' comparison.json > comparison.selected.json
diff -u owner.selected.json comparison.selected.json
```

The projection keeps three chosen fields. -r emits raw strings rather than JSON string quoting; @tsv produces a tab-separated row with escaping. -e makes false/null last results non-success, but expression/runtime failures have their own exit behavior. -S sorts object keys; it is not a universal JSON canonicalization scheme. diff should show no difference in these selected fields although the raw meta.request values differ.

## Standard-library alternative

If jq is unavailable, complete this local comparison without installing an arbitrary binary:

```bash
python3 - <<'PY'
import json
from pathlib import Path

selected = []
for name in ['owner.json', 'comparison.json']:
    value = json.loads(Path(name).read_text(encoding='utf-8'))
    if not isinstance(value, dict):
        raise SystemExit('Expected an object')
    row = {key: value[key] for key in ['id', 'owner', 'title']}
    selected.append(row)
    print(name, json.dumps(row, sort_keys=True))
print('selected fields equal:', selected[0] == selected[1])
PY
```

Expected equality: True. Missing keys stop this example rather than silently manufacturing a matching result. It still checks no application's authorization.

## Apply the method to permitted research evidence

Before processing a real saved response, confirm collection and retention were permitted, the response is complete, its status/type and which identity produced it. Minimize what you retain. Use field selection only after deciding which fields support the claim. Do not overwrite raw evidence with your filtered version or present synthetic outputs as live results.

A digest can help identify changed bytes, but cannot prove that data is authentic, authorized or complete. A header-name redactor is insufficient: tokens and private information may appear in query strings, bodies, filenames, screenshots and exports. Review everything shared, including terminal prompts and browser chrome. Never upload a private program response to an AI tool without explicit applicable permission.

## Exercise and explained answer

Question: the projected files match. Do the complete responses match? Answer: no; meta.request differs and was omitted. The conclusion is only that the selected parsed fields match.

Question: jq prints null for a missing owner field. Does that prove an anonymous owner? Answer: no. Missing data and business meaning are different; inspect the schema, status and actual response context.

Question: should an opaque numeric-looking identifier be converted to a number? Answer: not without a justified schema. Preserve it as supplied; conversions can change meaning or precision. Tool builds/versions can differ in numeric handling.

## Troubleshooting and cleanup

On parser failure, inspect the local file privately and verify completeness; do not fetch again automatically. On diff exit one, inspect differences rather than treating it as a tool crash. Do not hide errors with unconditional success wrappers.

Retain or delete only this known synthetic workspace after inspecting its exact path. No proxy, listener or remote account was created. No recursive deletion command is required.

## Source and validation limit

https://jqlang.org/manual/

Python's standard-library example can be checked offline independently of jq. Neither syntax checks nor synthetic data comparisons establish a live finding or verified learner execution.
