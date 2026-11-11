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

## Expanded teaching: reason about verification without weakening it

Use only the four existing fictional certificate cases and their P/A/B/C/D labels. No case contains an actual certificate or an executed client connection. This supplement adds no command, DNS lookup, server contact, verification bypass or trust-store change.

### Establish the reference identity before comparing names

The reference identity is the service the client intends to contact, established from the applicable request context, not selected afterward to make a presented certificate match. In this pack P01 expressly fixes that identity as portal.training.invalid. It is a paper label, not a target to resolve or visit.

Keep reference identity, certificate identity and connection address as separate concepts. The certificate's applicable identifiers must satisfy the client's service-identity rules. Merely seeing a familiar display name, choosing a different URL or connecting to an address does not establish the original intended service's identity.

The original exercise deliberately uses simple non-wildcard DNS SAN examples. It is not a complete lesson on wildcard handling, IP-address identifiers, internationalized names or every application protocol's matching rules. Do not invent such facts to decide these cases.

### Use a verification ledger rather than one pass/fail word

| Question | Evidence category | Common overclaim to avoid |
|---|---|---|
| Which service was intended? | Explicit reference identity | Replacing it with the name the certificate happens to contain |
| Do applicable names match? | Supplied identifier comparison or stated check | Treating a familiar issuer as a name match |
| Is an acceptable trust path established? | Client trust policy and path-validation evidence | Treating printed issuer text as successful validation |
| Does the verification time fit validity? | Stated time and certificate interval | Using today's date instead of the case's fixed time |
| Did a connection complete? | Supplied client connection record | Treating certificate data as an executed handshake |
| What remains unknown? | Missing policy/client/endpoint facts | Assuming every unspecified check succeeded |

This ledger organizes reasoning; it is not a complete certificate validator. Name, path and time are necessary distinctions, but a short record can omit additional applicable policy or algorithm checks. Label omissions rather than filling them with a preferred result.

### Work the name/trust contrast using supplied labels

For Case A, P01 fixes portal.training.invalid while A01 supplies only files.training.invalid in the DNS SAN. A02 expressly reports successful path validation under the fictional client's configured trust anchor. That supplied trust result does not resolve the distinct service-name mismatch.

For Case B, B01 matches the reference identity, while B02 expressly says the client could not establish a trusted certification path. The matching name is not permission to accept an unestablished path. B04 withholds information needed to distinguish causes, so a reviewer must not claim one definite root cause.

These cases show that improving one column does not automatically repair another. A report should name the supported mismatch or failed check and preserve the independent facts. It should not collapse both cases into “bad certificate” without explaining the difference.

### Preserve the case's verification time

P02 fixes the fictional client verification time at 2026-02-10T12:00:00+00:00. Do not substitute the current date, the lesson-reading date or a timestamp invented by the learner. A time-based conclusion belongs to that explicit scenario assumption.

C02 says the validity ended at 2026-01-31T23:59:59+00:00, before P02. This supports the interval comparison under the supplied time. C03's note about a trusted issuer does not establish a completed handshake or independently verify the client's clock.

In a real authorized investigation, clock configuration and verification records would matter. Here, do not change a clock to move the certificate inside its interval or generate a new result. State that the paper comparison uses P02 and that no actual client time was checked.

### Interpret narrowly supported success

D02 expressly reports successful path, service-name and validity checks at P02 under the stated fictional trust policy. D03 adds a completed TLS connection and an HTTP 200. Those supplied statements support a narrow fictional success claim for that client, service context and time.

D04 expressly withholds content, application authorization, downstream transport, endpoint integrity and other clients' trust evidence. A 200 does not fill those gaps. Do not transform the case into proof that every learner may access every record or that every device trusts the service.

Similarly, do not invent a certificate fingerprint, algorithm, revocation result or chain transcript to make the report look complete. Missing detail is part of the exercise's evidence boundary, not a blank to be filled with plausible technical values.

### A bypass changes the question rather than answering it

The original lesson identifies curl's insecure option as skipping peer verification. A transfer that succeeds only after verification is disabled does not show the missing identity or trust property has been established. The relevant security check was removed, not demonstrated successful.

No bypass should be run for these paper cases. There is also no instruction to follow a browser warning, install a CA, substitute another hostname or alter a trust environment. These are consequential changes, not neutral additions to a fictional worksheet.

Curl's certificate behavior depends on its build, TLS backend and effective trust configuration. That matters when comparing future authorized client evidence, but this assignment does not ask the learner to discover those settings on a real system. Record unspecified configuration as unknown.

### Choose the smallest clarification on paper

For an unestablished path, ask for approved provenance and relevant chain/trust-policy evidence rather than guessing which CA to install. For a time question, ask what time basis the record used rather than weakening validation. For a name mismatch, preserve the intended identity rather than selecting the presented name as a new target.

These are categories of clarification for an authorized review, not instructions to fetch missing records or contact scenario names. A suitable worksheet can end with an unresolved question when the supplied facts cannot decide it.

### Human-led AI critique and explained checks

First manually review the fictional claim “Case D proves the whole application is secure.” If an approved assistant is available, provide only P01-P04 and D01-D04, ask which supplied facts support each part, and reject any invented handshake detail or proposed active test. Manual critique satisfies the same objective; no real certificate, private key, identity or session data should be supplied.

Check your own answer: A separates trusted path from wrong name; B separates matching name from missing trust; C compares against P02 without claiming a clock test; D limits success to its supplied record. Those are paper reasoning outcomes, not results of certificate processing or network execution.

Technical basis: curl TLS Certificate Verification, https://curl.se/docs/sslcerts.html , and OWASP Transport Layer Security Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html . Existing case packs and worksheets are unchanged. No client behavior, trust installation, handshake or assessor calibration is claimed.
