# Use Repeater for a controlled comparison

## Goal and prerequisites

Repeat a permitted request deliberately and attribute a difference to one changed variable. Complete the basic tool and identity lessons. Confirm that proxying and manual replay are allowed. A UI action can be permitted while repeating its state-changing request is not; never use payments, invitations, emails or destructive actions as a generic baseline.

## Understand the tool

Burp history records an exchange; Repeater prepares another exchange. Copying a request does not freeze server state or extend session life. Destination, authentication, anti-CSRF values, content type and application state can all change the interpretation. Tool scope filters are not a firewall.

## Manual procedure

1. Choose one already-observed, permitted read-only operation on your own synthetic record. Write the expected result and budget before Send.
2. From HTTP history, use Send to Repeater. Verify destination scheme, host and port; the path and method; and the coherent caller context. Private tab labels are reminders, not evidence of identity.
3. Send unchanged once if the plan allows. Compare the baseline's relevant fields, HTTP status and application result. If the baseline fails, stop; do not start mutating it.
4. Form one narrow hypothesis. For an allowed controlled comparison, change exactly the planned variable. Cross-account testing needs its own permission and ownership controls; refer to that lesson.
5. Review the entire prepared request before sending. A copied header or body value can retain the old identity. Do not alter framing headers or use malformed HTTP for a normal business comparison.
6. Send once within the budget, then inspect only relevant permitted data. Record alternative explanations such as stale state, public sharing, caches or session expiry.

## Offline control exercise

```bash
python3 - <<'PY'
rows = [
    ('baseline', 200, 'Synthetic A'),
    ('candidate', 200, 'Login required'),
]
for label, status, body in rows:
    print(label, 'http=', status, 'contains expected object=', body == 'Synthetic A')
PY
```

Both statuses are 200 but only the baseline contains the expected synthetic object. Response length and protocol status are shortcuts, not proof of equivalent application results.

## Exercise and explained answer

Prepare a private comparison record: baseline identity/object/state; changed variable; result; unchanged assumptions; supported conclusion; uncertainty.

You changed Cookie, object ID and body together and got 403. Which change caused it? The experiment cannot isolate that cause. Return to a known baseline and design a narrower comparison, subject to permission and budget.

Repeater now returns 401. Should you enumerate more objects? No. Verify authentication and intended state first; additional identifiers cannot repair an invalid control.

## Troubleshooting and cleanup

A request held in Proxy Intercept can make a browser wait. Check tool state before diagnosing an outage. Stop on rate limiting or unexpected errors; do not enable retries, macros or extensions to force progress. Close credential-bearing tabs and the temporary project when done. Keep only minimal reviewed evidence.

## Reference and evidence limit

https://portswigger.net/burp/documentation/desktop/getting-started/intercepting-http-traffic

The printed comparison is offline. The Burp procedure is authored guidance, not a claimed executed practical.
