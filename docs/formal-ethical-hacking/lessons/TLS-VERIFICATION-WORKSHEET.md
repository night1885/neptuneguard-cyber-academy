# Transport verification — evidence worksheet

Draft blank worksheet for EH-TLS-01 and EH-TLS-02. Complete only with fictional case records. This is not an authorization form, key store, trust configuration or data collection service.

## 1. Scope and assumptions
Case identifier:
Intended service identity and source label:
Verification time and source label:
TLS endpoints described:
Trust policy/configuration described:
Explicit unknowns:

## 2. Separate checks
| Question | Supplied evidence | Supported result | Missing evidence or qualification |
|---|---|---|---|
| Service identity match | To complete | To complete | To complete |
| Trusted certification path | To complete | To complete | To complete |
| Validity at scenario time | To complete | To complete | To complete |
| Completed authenticated connection | To complete | To complete | To complete |
| Other applicable client policies | To complete | To complete | To complete |

Do not turn an absent record into a successful check. Do not infer name matching from chain trust or chain trust from name matching.

## 3. Conclusion
Narrow connection-level claim supported:
Evidence labels:
Application-security claims not established:
Downstream and stored-data protection not established:
Other clients/configurations not represented:

## 4. Next authorized decision
Smallest useful clarification:
Responsible owner/role, if specified:
Authority required before any configuration change:
Why a verification bypass would not establish the missing property:
Comparable evidence needed after an approved correction:

## Batch state and release gates
This batch contains authored conceptual lessons and fictional evidence only. No certificate was generated or installed; no CA was trusted; no TLS handshake, browser request or network test was executed. No TLS server, hosted target, academy-architecture change, runtime integration, publication or Community Learning modification is included.

Before release, obtain technical review, assess the case wording with representative learners, check accessible equivalents and private evidence handling, calibrate scoring and register course metadata separately. Any future practical TLS environment requires its own reviewed build, trusted material provenance, exact authorization and cleanup validation.

Source basis:
https://curl.se/docs/sslcerts.html
https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
