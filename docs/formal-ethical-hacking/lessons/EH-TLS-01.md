# EH-TLS-01 — Understand what HTTPS protects

Draft conceptual lesson, not published. Requires EH-WEB-01 and EH-NET-02. Proposed ID only; no runtime registration. This lesson does not convert the earlier plain-HTTP fixture into HTTPS or authorize external requests.

## Outcomes
Distinguish confidentiality, integrity and peer identity; identify the endpoints of a protected connection; and avoid treating HTTPS as proof of application security.

## Follow the connection boundary
TLS can protect application traffic in transit between the participating TLS endpoints. Confidentiality limits disclosure of the protected traffic to parties without the required keys. Integrity checks help detect unauthorized changes to protected records. Certificate-based server authentication depends on validating the certificate and the intended service identity, alongside the protocol's proof of private-key possession.

These are different properties. An encrypted connection to an unverified peer is not equivalent to a properly authenticated connection to the intended service. A certificate is not a password and its public contents are not a secret; the corresponding private key must be protected. This lesson creates or handles neither.

The browser normally acts as a TLS client for HTTPS. In a reverse-proxy design, the public TLS connection can end at the proxy rather than the application process. A separate downstream connection needs its own protection decisions. A diagram label saying HTTPS on one hop does not describe every other hop or stored copy.

## Application controls remain necessary
HTTPS does not decide which user's record an authenticated person may access. It does not fix SQL query construction, unsafe HTML output, mass assignment or file-path authorization. Connect those limits to the earlier offline fixtures: encryption of an incorrect request or response does not make the underlying operation correct.

TLS also does not automatically encrypt application logs, database rows, backups or screenshots at rest. Logs and evidence still need privacy and retention controls. Traffic protection does not prove that either endpoint itself is uncompromised.

## Plain HTTP in the existing lab
The clean peer fixture in EH-LAB-04 uses plain HTTP for bounded protocol observation on the internal practice network. No credentials or personal data belong in it. Do not point a browser login or real session at that fixture and assume internal networking provides HTTPS-equivalent properties.

Replacing http with https in a URL does not configure a TLS server. The existing fixture has not been provisioned or tested as one. A practical TLS lab would need its own reviewed certificate setup, trust procedure, exact endpoints and reset instructions; none is introduced here.

## Independent reasoning
Draw a fictional browser-to-proxy-to-application path. Mark what each stated TLS connection would protect and which links remain unspecified. Explain why a valid public-facing certificate would not prove downstream encryption or resource authorization. State which missing facts would require clarification before calling the complete path protected.

## Evidence and limits
Submit an annotated boundary explanation and bounded conclusions. Keep proposed architecture separate from actual observations. No network test, key generation, certificate installation or production inspection is required. Student calibration, accessibility review and formal grading remain pending.

Source: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
