# Review WebSocket handshakes and message trust

## Outcome and prerequisites

Explain how a WebSocket session starts as an HTTP handshake and which decisions still apply to later messages. Complete the browser-network, session and CSRF lessons. Use only a program-permitted real-time feature and controlled accounts. Do not message real users, flood a connection or test another person's live session.

The handshake establishes the session context for the connection. Origin checks, session binding and per-message authorization are different controls. Treat messages as untrusted in both directions. PortSwigger notes that ordinary web vulnerabilities can reappear through WebSockets and recommends CSRF protection on the handshake.

## Offline state model

```bash
python3 - <<'PY'
sessions = {'handshake-A': 'A', 'handshake-B': 'B'}
documents = {'doc-1': 'A'}
def read_message(connection, document_id):
    user = sessions.get(connection)
    return user is not None and documents.get(document_id) == user
for connection, doc in [('handshake-A', 'doc-1'), ('handshake-B', 'doc-1'), ('missing', 'doc-1')]:
    print(connection, doc, read_message(connection, doc))
PY
```

Expected True, False, False. The dictionaries stand in for server-side handshake state; this is not a WebSocket server and proves nothing about a real application.

## Tool workflow with Burp

1. Confirm that the program permits the real-time feature, proxy use and message class. A connection can generate more traffic than one HTTP request.
2. Use the Burp browser with controlled accounts only. Open the feature and observe Proxy WebSockets history. Record scheme, direction, message type and order without retaining tokens.
3. Identify which values the handshake carried: cookies, authorization data, Origin and application parameters. Do not assume a visible URL value is the authentication source.
4. Observe ordinary messages for your own synthetic object. Do not edit them yet.
5. Only if the program explicitly allows it, preserve one baseline message, change one planned field and send once. Treat a closed connection as a stop signal, not a reason to loop or reconnect repeatedly.
6. Cross-site handshake validation needs separate permission and a page you control. Do not run a test that could affect real users.

## Exercise and explained answers

A ws URL appears instead of wss. What follows? It is a transport-security observation to judge against the program rules and environment; secure designs prefer wss.

B's connection requests A's synthetic object and the server returns it. Is that enough? It supports a narrow controlled cross-owner read only if A's ownership, B's identity and the minimal fields are verified. Do not enumerate objects.

## Troubleshooting and cleanup

Expired sessions, idle timeouts and proxy settings can close connections. Do not retry in a loop. Close the Burp browser and connection, discard stale tokens and keep only minimal redacted evidence.

## Source and validation limit

https://portswigger.net/web-security/websockets

Only the dictionary model is executed. No WebSocket connection or live message was made.
