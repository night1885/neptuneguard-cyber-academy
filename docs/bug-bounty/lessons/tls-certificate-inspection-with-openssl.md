# Inspect a TLS certificate without trusting the output blindly

## Outcome and prerequisites

Read certificate names, validity and verification result from an approved HTTPS service. Complete the HTTP-request lesson. A single TLS handshake is usually lightweight, but you must still use an in-scope host and follow the program's rules. Do not test protocol downgrade, renegotiation or cipher enumeration unless the program permits it.

## Command

```bash
openssl version
openssl s_client -connect app.example.invalid:443 -servername app.example.invalid -verify_return_error -brief < /dev/null
```

-connect names the host and port. -servername sets SNI, the host name the client asks for. -verify_return_error makes verification errors abort the handshake. OpenSSL documents that, by default, s_client continues after certificate verification errors and accepts any chain, so never read a successful connection as proof the certificate is valid. -brief prints a short summary; redirecting standard input from /dev/null avoids waiting for interactive input.

Expected: a protocol and cipher summary plus a verification result, or a failure message. -showcerts displays certificates as sent by the server, which OpenSSL says is not a verified chain.

## Interpreting evidence

Record host, date, verification result and certificate subject/validity from the output. A certificate whose names include other hosts does not make those hosts in scope. An expired or untrusted certificate may reflect a client trust-store problem, so check your system time and CA store before reporting anything.

## Offline date exercise

```bash
python3 - <<'PY'
from datetime import date
not_after = date(2026, 12, 1)
today = date(2026, 11, 13)
print('days remaining:', (not_after - today).days)
PY
```

Expected: 18.

## Exercise and answer

A certificate expires in 18 days. Is that a vulnerability? Not by itself; it is an operational observation unless the program defines it as reportable.

## Troubleshooting and cleanup

Firewalls, proxies and missing SNI can alter results. Do not retry in a loop. Do not paste private keys or client certificates into notes.

## Source and validation limit

https://docs.openssl.org/master/man1/openssl-s_client/

Only the date calculation runs offline; no TLS connection was made.
