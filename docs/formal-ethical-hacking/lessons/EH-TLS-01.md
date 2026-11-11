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

## Expanded teaching: draw the protected connection, not a blanket security label

This is conceptual teaching only. It does not configure HTTPS, generate keys, install certificates, inspect a real service or add a request to the earlier HTTP exercise. All diagrams and scenarios below are fictional paper models.

### Ask three questions about each stated connection

Confidentiality asks whether protected application traffic is concealed from parties without the necessary keys. Integrity asks whether unauthorized changes to protected records can be detected. Peer authentication asks whether the connection is associated with the intended peer under the applicable verification rules.

These properties work together but are not synonyms. Saying “the bytes were encrypted” does not establish that the client verified the intended service. Saying “the certificate names match” does not establish a complete accepted trust path or that any handshake completed. Keep the property's name beside the evidence that supports it.

TLS protects traffic between its participating endpoints. It does not eliminate the need to trust the endpoint processes handling plaintext. A legitimate server can still return information the application should not have released. Encryption protects the transport of that information; it does not retroactively authorize its disclosure.

### Locate the TLS endpoints on paper

Draw three boxes labelled fictional browser, fictional reverse proxy and fictional application. Place a connection label on each edge rather than writing HTTPS over the whole page. If the supplied facts establish client-to-proxy TLS, mark the proxy as that connection's server-side endpoint.

Do not extend the same protection claim automatically across the proxy-to-application edge. That connection might have a separate protected configuration, be plaintext or simply be unspecified in the provided record. The honest diagram labels the unknown rather than filling it with the design the learner wishes existed.

A proxy that terminates TLS processes the decrypted application traffic there. Re-encrypting onward, where a design expressly supplies it, creates another connection with its own endpoints and verification assumptions. It does not make the first connection's certificate proof of all properties on the second.

### Worked architecture comparison — FICTIONAL

Scenario One expressly supplies verified browser-to-proxy TLS and says nothing about the downstream connection. A justified conclusion is that the stated first hop is protected under those assumptions; downstream protection is unestablished.

Scenario Two expressly supplies that first hop plus a separate verified TLS connection from proxy to application. Its diagram can mark two protected connections. It still cannot claim that application logs, database records, backups or screenshots are encrypted at rest, or that the application enforces correct object permissions.

Neither scenario is a measurement. Write “the fictional design states” rather than “I observed” when discussing the supplied diagram. To assess a real path, an authorized reviewer would need implementation evidence for the actual endpoints and settings; this supplement does not request that inspection.

### Keep service authentication distinct from learner authentication

In the usual server-authenticated HTTPS model, certificate verification helps the client establish the service's identity. That is not a login as a learner or an instructor. Application authentication and authorization still need their own evidence.

Client-certificate authentication is another possible TLS arrangement, but it is not supplied by the existing certificate case pack and no provisioning exercise is introduced here. Do not infer mutual authentication from an HTTPS label or from a server certificate alone.

Likewise, possession of a public certificate file is not possession of the corresponding private key. Certificate data can be inspected as public information, but successful connection authentication requires the protocol and validation process, not merely reading a certificate-shaped document. This lesson handles neither real certificate files nor private keys.

### Connect HTTPS to the authorization evidence lesson

Take the existing fictional classmate-disclosure case as a paper thought experiment. Suppose its response travelled over correctly verified TLS. The transport property and the application permission failure can both be true: the channel protected a response that the application should not have released to that subject.

Now consider a properly denied response over a hypothetical unprotected connection. Correct denial for that action would not establish confidentiality for sensitive traffic elsewhere. The security questions are complementary rather than substitutes for one another.

This is why “uses HTTPS” is not a sufficient access-control finding or a complete assurance statement. Name the property and the boundary you actually evaluated instead of assigning one security adjective to the whole application.

### Preserve the existing plain-HTTP fixture boundary

The earlier internal peer is intentionally a plain-HTTP teaching fixture. Changing a URL's scheme is not a server-side configuration procedure, nor does a private network name establish encrypted transport or verified service identity.

Keep credentials, personal data and real session values out of that fixture. Do not add a browser login, install a local CA or modify the peer to imitate the conceptual diagram. Any future TLS practical would need its own explicit scope and reviewed setup; this supplement creates none.

### Distinguish protection from evidence handling

A protected connection does not authorize retaining every byte visible at either endpoint. Application logs and screenshots can contain sensitive information after TLS has delivered it. Evidence minimization and the actual private handling process still apply.

A diagram should distinguish connections from storage locations. A database cylinder, log file or screenshot is not another TLS hop. If encryption at rest or access to those copies is unspecified, record that gap without claiming an observed exposure.

### Formative questions with explained answers

1. Does a valid public-facing service certificate prove downstream encryption? No. The proxy's downstream connection is a separate boundary with its own evidence.
2. Can a correctly protected channel carry an unauthorized response? Yes. Transport protection does not implement the application's subject/resource permission rule.
3. Does HTTPS establish that the learner logged in? No. Ordinary server authentication identifies the service to the client, not the learner's application account.
4. Does changing the URL configure TLS on the clean peer? No. The existing fixture has no reviewed TLS setup and the change is not authorized.
5. Are logs automatically protected at rest because a response used TLS? No. Stored copies require their own handling and protection decisions.
6. Is an unspecified connection necessarily plaintext? No. Unspecified means the supplied facts do not establish its protection either way.

Technical basis: OWASP Transport Layer Security Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html . No handshake, key operation, configuration change, endpoint inspection or learner-platform reproduction was executed for this supplement.
