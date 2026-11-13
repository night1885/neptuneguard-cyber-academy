# Study request boundaries without sending ambiguous requests

## Outcome and prerequisites

Explain why disagreement between a front-end and back-end server about where a request ends can affect other users. Complete the cache and Burp lessons. PortSwigger describes request smuggling as often critical and says it can compromise other users. Do not send desync probes to a live program or shared service unless the program explicitly permits this class of test and a coordination plan.

## Offline boundary model

```bash
python3 - <<'PY'
def length_view(body):
    return body[:13]
def chunk_view(body):
    return body.split('0\r\n\r\n')[0] + '0\r\n\r\n'
body = '0\r\n\r\nSYNTHETIC-NEXT'
print('length parser consumes:', repr(length_view(body)))
print('chunk parser consumes :', repr(chunk_view(body)))
print('leftover for length parser:', repr(body[len(length_view(body)):]))
print('leftover for chunk parser :', repr(body[len(chunk_view(body)):]))
PY
```

Expected: the two simplified parsers consume different byte counts and leave different leftovers. This models disagreement only; it does not implement HTTP, connection reuse or real servers.

## Key concepts

HTTP/1 can describe body length with Content-Length or chunked Transfer-Encoding. A front end and back end can disagree about which header wins or how an obfuscated header is read. PortSwigger names CL.TE, TE.CL and TE.TE variants. HTTP/2 end to end avoids this ambiguity, but downgrading to HTTP/1 can reintroduce risk.

## Program-based approach

Read the program rules for network-level and desync testing. If it is not expressly allowed, document the architecture hypothesis from normal evidence, such as protocol versions seen in the browser, and stop. If it is allowed, a coordinated plan should specify the host, time, request limit, stop conditions and who to contact. Burp Repeater has protocol and content-length settings that affect these tests, so verify them before any permitted work.

## Exercise and answer

Why is a one-request test not necessarily harmless? A smuggled prefix can attach to the next request on a shared connection, which may belong to another user.

## Troubleshooting and cleanup

Do not repeat a probe after an unexpected response. Close connections, stop and contact the program. Record times and requests sent.

## Source and validation limit

https://portswigger.net/web-security/request-smuggling

The offline model is a simplification; no HTTP request was sent.
