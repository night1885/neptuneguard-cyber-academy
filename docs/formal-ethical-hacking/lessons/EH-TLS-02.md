# EH-TLS-02 — Separate certificate identity, trust and time checks

Draft paper exercise, not published. Requires EH-TLS-01. Use TLS-CERTIFICATE-CASEPACK.md only. No live server, certificate chain, trust-store modification or verification bypass is authorized.

## Outcomes
Distinguish reference identity, certificate names, certification-path trust, validity time and evidence gaps. Explain why disabling verification cannot establish the missing property.

## Ask separate questions
What service identity did the client intend to contact? What identity information is represented in the certificate, including the applicable Subject Alternative Name entries? Can the client validate an acceptable certification path under its configured trust policy? Is the certificate valid at the relevant verification time? Are other applicable checks and algorithm policies satisfied?

A familiar issuer name printed in a certificate is not proof of successful chain validation. A matching name does not make an untrusted issuer trusted. A trusted chain does not make the wrong service name correct. Being inside a validity interval does not establish the other properties. The client time and trust configuration are part of the evidence.

Modern identity verification uses appropriate certificate identifiers, not a guessed name based only on the connected address or a decorative subject string. A certificate for one service must not be treated as authority for an unrelated one. This lesson uses explicit non-wildcard DNS-name examples and does not attempt a complete identifier-matching specification.

## Do not hide the failure
curl verifies server certificates by default and checks the server name from the requested URL. Its -k/--insecure option skips peer verification; a transfer succeeding after that change does not show that identity verification was repaired. Do not use that option for this assignment or accept a browser warning to make an example look successful.

Likewise, adding an unknown CA to a system trust store changes the client's trust policy; it is not a neutral diagnostic step. An authorized private lab might use a specifically provisioned CA, but that requires verified provenance, narrow scope and a tested removal procedure. No such installation is requested here.

## Interpret evidence precisely
A locally parsed certificate shows certificate data, not a completed authenticated TLS connection. A connection record reporting successful verification supports only its stated endpoint, client configuration and time. It does not establish that every client would trust the service or that the application has correct access control. Revocation behavior and other policy checks vary by client/configuration and must not be assumed from a short record.

If verification fails, distinguish an observed error from a unique diagnosis. Missing intermediates, trust configuration, name mismatch, time settings or other conditions can require different investigation. Preserve exact evidence and ask the smallest useful clarification; do not silently weaken verification.

## Offline assignment
Analyse the four fictional cases. For each separate identity, trust, validity and unknowns. State what the supplied records justify, what remains unverified and a proposed authorized next step. Do not resolve the scenario names, connect to an address or generate missing output.

## Assessment and limits
Use TLS-VERIFICATION-WORKSHEET.md. Review independent treatment of the checks, explicit assumptions, privacy and restraint in conclusions. No real TLS handshake, browser behavior or certificate processing was executed in this authoring batch. Formal scoring and learner calibration remain pending.

Sources:
https://curl.se/docs/sslcerts.html
https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
