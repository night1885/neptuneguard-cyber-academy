# Domain foundations — instructor guidance

Draft visible learning support for [DOMAIN-F1](DOMAIN-FOUNDATIONS-01.md), [DOMAIN-F2](KERBEROS-FOUNDATIONS-02.md) and [DOMAIN-F3](DOMAIN-FOUNDATIONS-CAPSTONE.md). No protected exam answers, actual directory or credential material.

## Teach the mechanism before attack names
Ask learners to draw the directory/container model separately from the permission graph. Have each edge name the subject, operation, object/scope, evidence and exclusions. Then redraw the AS/TGS/AP relationships and ask what the next unproven step is. A protocol message, ticket issuance, service acceptance and resource operation are distinct observations.

Do not assert that a directory group name, cached TGT or service ticket grants all access. Do not imply that no domain-controller contact ever occurs for service validation; Windows-specific requirements such as PAC processing need their own implementation review. Likewise do not say every future application byte is automatically protected merely because Kerberos authenticated the start of a connection.

## Visible case guidance
| Case | Bounded interpretation |
|---|---|
| D01 | Unsupported. A delegated task in a limited scope is not forest-wide control. |
| D02 | Supported only as the explicit fictional fact of that one permitted read. |
| D03 | Unsupported. A cached TGT does not supply service acceptance or object permissions. |
| D04 | Unsupported. Service-ticket issuance is not a completed service/application exchange. |
| D05 | Unsupported under the supplied separate policy; authentication does not override its denied object access. |
| D06 | Unsupported unique-cause claim. The clock-related observation does not establish the password result. |
| D07 | Unsupported. Failed service-name resolution is not an observed KDC permission decision. |
| D08 | Unsupported. Unresolved naming/configuration and incomplete evidence do not establish a single secret/key cause. |
| D09 | Supported only for the given read; edit remains untested/unknown. |
| D10 | Unsupported. One-direction evidence does not prove the intended mutual-authentication use. |
| D11 | Stop/sensitive-material decision. Removing a label does not make credential-bearing material public-safe. |
| D12 | Stop/scope decision. Workgroup approval does not authorise domain installation, join, queries or ticket access. |

## Review worksheet
| Dimension | Actual explanation | Intervention | Missing fact / follow-up |
|---|---|---|---|
| Object/container versus authority | | | |
| AS/TGS/AP roles and evidence | | | |
| Authentication versus resource decision | | | |
| Alternative failure explanations | | | |
| Scope, privacy and lab-readiness blockers | | | |

Record independent reasoning separately from instructor rescue. Paper diagrams do not establish domain administration, packet analysis, attack execution or professional readiness. No numeric pass mark, automatic progress, identity verification or lab grant is defined.

A future practical needs a separate licensed/supported environment and explicit action/evidence scope. Do not use an employer/home domain, public service, real ticket cache or cloud trial to fill missing material. Baseline authentication, actual resource authorisation, controlled diagnostics, isolation and post-restore state must be reproduced and reviewed before release. Current Windows workgroup restrictions remain intact.
