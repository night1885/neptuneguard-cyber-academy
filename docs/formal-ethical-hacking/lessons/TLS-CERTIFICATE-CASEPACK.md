# TLS verification — fictional case pack

All names, client records, issuers and verification results are invented. Names ending in .invalid are paper labels, not targets. This pack contains no actual certificate, private key, server or executed handshake. Do not query or connect to any name.

## Common scenario
P01: The intended reference identity is portal.training.invalid.
P02: The fictional client verification time is 2026-02-10T12:00:00+00:00. This is a scenario time, not the current date or an author test date.
P03: The exercise discusses a single server-authenticated TLS connection; no downstream transport, client-certificate authentication or application-authorization evidence is supplied.
P04: No case authorizes bypassing verification, installing a CA or using real account data.

## Case A — name mismatch despite a stated trusted path
A01: Certificate DNS SAN contains only files.training.invalid.
A02: The fictional client record reports that path validation to its configured trust anchor succeeded.
A03: Certificate validity is 2026-01-01T00:00:00+00:00 through 2026-12-31T23:59:59+00:00.
A04: No service-name check result is supplied.

Task: compare the intended identity with the supplied certificate identity. Explain why A02 cannot substitute for the separate name check.

## Case B — matching identity but no established trust
B01: Certificate DNS SAN contains portal.training.invalid.
B02: The fictional client reports that it could not establish a trusted certification path.
B03: The certificate is within the same validity interval as Case A.
B04: No approved CA provenance, complete chain evidence or trust-store inventory is supplied.

Task: identify what matches, what failed and what evidence would help distinguish possible trust failures. Do not infer a unique cause or propose disabling validation as a repair.

## Case C — validity interval does not include the stated time
C01: Certificate DNS SAN contains portal.training.invalid.
C02: The certificate validity ended at 2026-01-31T23:59:59+00:00.
C03: A fictional configuration note says the issuer is trusted, but provides no completed handshake record or independent clock evidence.

Task: compare with P02, preserve the supplied time assumption and explain why an issuer note cannot establish all connection properties.

## Case D — narrowly supported success
D01: Certificate DNS SAN contains portal.training.invalid.
D02: The fictional client record reports successful path, service-name and validity checks at P02 under its stated test trust policy.
D03: The record reports a completed TLS connection and a subsequent HTTP 200 response.
D04: No content, authorization, downstream transport, endpoint-integrity or other clients' trust evidence is provided.

Task: state the narrow success claim the supplied record supports, without asserting whole-application security or universal trust. Identify at least three remaining unknowns.

## Evidence rules and validation
Cite P01-P04 and the relevant case labels. All conclusions are analyses of supplied fictional statements, not your measurements. Do not invent a certificate fingerprint, cryptographic algorithm, revocation result, transcript, severity score or active test.

No certificate case or client behavior was executed during authoring. Technical peer review, learner calibration, accessibility and private submission handling remain release work. This fictional dataset makes no real vendor or server claims.
