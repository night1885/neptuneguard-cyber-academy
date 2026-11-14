# Inspect a TLS certificate without trusting the output blindly

## Outcome and prerequisites

Read certificate names, validity and verification result from an approved HTTPS service. Complete inspect-approved-http-request.md first. A single TLS handshake still needs an in-scope host and applicable permission. Do not test downgrade, renegotiation or cipher enumeration unless the program permits it.

Use a new private directory, Bash, OpenSSL and GNU timeout. Check openssl version, openssl s_client -help, openssl x509 -help and timeout --version locally. If the required options or timeout utility are unavailable, use an approved installation process or complete the analysis without execution. Do not remove time bounds to force a result.

## One conditional program connection

Replace the example hostname only after checking scheme, host, port and the planned connection against the current program rules. The following is one connection attempt with no retry loop. Run it only in an empty private directory because it creates output files.

```bash
umask 077
if timeout 15s openssl s_client \
  -connect app.example.invalid:443 \
  -servername app.example.invalid \
  -verify_hostname app.example.invalid \
  -verify_return_error -showcerts \
  < /dev/null > tls-session.txt 2> tls-diagnostics.txt; then
  openssl x509 -in tls-session.txt -out leaf.pem &&
  openssl x509 -in leaf.pem -noout -subject -issuer -dates -ext subjectAltName
else
  printf '%s\n' 'Connection or verification did not complete; inspect private diagnostics and stop.'
fi
```

-connect sets the network destination. -servername requests a TLS virtual host using SNI; it is not hostname verification. -verify_hostname checks the certificate identity for the intended hostname, while -verify_return_error aborts on verification errors rather than continuing. Verification depends on the local trust store and clock. These options do not constitute a full browser-equivalent certificate policy or revocation audit.

-showcerts provides the certificates sent by the server, not a verified chain. The first x509 command extracts the first certificate as a local PEM file. The second reads that file offline and displays subject, issuer, validity dates and Subject Alternative Name. There is no second connection for this inspection. Keep the verification diagnostics separate from the displayed certificate fields.

Expected: if verification and connection completion succeed, certificate details appear. On timeout, handshake, extraction or verification failure, stop and record the limitation. A timeout is not evidence of a bad certificate. Do not disable hostname or chain checks to make the command succeed. Session transcripts can contain sensitive session information; keep them private and redact before sharing.

## Offline date exercise

```bash
python3 - <<'PY'
from datetime import date
not_after = date(2026, 12, 1)
today = date(2026, 11, 13)
print('days remaining:', (not_after - today).days)
PY
```

Expected: 18. This is synthetic date arithmetic, not a live certificate observation.

## Exercise and answers

Does SNI prove the returned certificate matches the hostname? No. It selects the requested virtual host; verification is a separate check.

Does a displayed certificate establish trust? No. You need the actual verification result, intended hostname, trusted roots and correct time. Certificate names do not expand program scope.

Is an expiry in 18 days automatically reportable? No. Follow the program's accepted finding categories and explain only supported impact.

## Troubleshooting and cleanup

Check your system time, approved CA store and proxy context before interpreting errors. Do not add untrusted roots, supply private client keys or retry in a loop. Remove only your own tls-session.txt, tls-diagnostics.txt and leaf.pem when policy permits; do not retain excess session data.

## Sources and validation limit

https://docs.openssl.org/master/man1/openssl-s_client/

https://docs.openssl.org/master/man1/openssl-x509/

Authoring checks cover shell syntax, the date example, extraction from a synthetic local transcript and local certificate-verification controls. No live TLS handshake, browser reproduction or real-program connection was run.
