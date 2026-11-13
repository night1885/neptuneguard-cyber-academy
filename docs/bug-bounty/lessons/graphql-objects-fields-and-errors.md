# Review GraphQL objects, fields and operation outcomes

## Outcome and prerequisites

Apply identity, object and field policy to a GraphQL interface without treating HTTP 200 as application success. Complete authorization and JSON lessons. Use a known permitted endpoint and existing allowed operation; do not discover endpoints by guessing or send broad schema/depth/batching probes as routine practice.

A GraphQL request can name an operation, supply variables and select fields. Authorization must apply where data and actions are resolved, not only at an HTTP route or top-level object. A public schema description is not automatically sensitive, and an errors array can coexist with partial data. Measure the actual operation result.

## Offline request and resolver model

```bash
python3 - <<'PY'
import json
request = {
    'operationName': 'ReadNote',
    'query': 'query ReadNote($id: ID!) { note(id: $id) { id title } }',
    'variables': {'id': 'synthetic-1'},
}
print('request:', json.dumps(request, sort_keys=True))
record = {'id': 'synthetic-1', 'owner': 'A', 'title': 'Synthetic draft'}
def resolve(viewer, field):
    if viewer != record['owner']:
        return {'error': 'denied'}
    if field not in {'id', 'title'}:
        return {'error': 'field denied'}
    return {field: record[field]}
print('owner title:', resolve('A', 'title'))
print('nonowner title:', resolve('B', 'title'))
print('hidden field:', resolve('A', 'owner'))
PY
```

Expected: a JSON request envelope, an allowed owner title, a nonowner denial and a hidden-field denial. This function is not a GraphQL parser, schema or HTTP server. It does not validate query complexity, argument coercion or all resolver paths.

## Conditional program workflow

Observe one permitted normal operation in Developer Tools Network or Burp history. Identify the endpoint, operation name, variables, selections, caller and relevant synthetic object. Keep complete tokens private. An HTTP POST can carry a read query, while a mutation can change state; understand semantics rather than relying on the method label.

If the program permits a bounded controlled authorization comparison, use the exact synthetic object and coherent A/B contexts from the authorization lesson. Avoid aliases, batching, depth increases or large selections to amplify the test. Inspect data, errors and resulting state together. Record which specific object/field was disclosed or denied without claiming every resolver behaves identically.

## Exercise and explained answers

A response has status 200 and errors saying access denied. Did the mutation succeed? Not established. Inspect the operation's data and permitted state verification; status alone is insufficient.

Does hiding a field in the UI guarantee the resolver rejects it? No. Interface visibility and server-side field authorization are separate. Test only within applicable permission.

## Troubleshooting and cleanup

Invalid query syntax, wrong operationName, stale variables and expired authentication can resemble authorization failure. Restore a known baseline before interpreting a denial. Stop on cost/rate errors, retain minimal synthetic evidence and remove only permitted test records through normal workflows.

## References and evidence limit

https://portswigger.net/web-security/all-materials

https://owasp.org/API-Security/editions/2023/en/0x11-t10/

No live GraphQL request or schema exploration was executed. The offline resolver is a limited teaching model.
