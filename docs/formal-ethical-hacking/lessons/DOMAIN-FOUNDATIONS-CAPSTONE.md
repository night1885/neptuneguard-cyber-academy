# DOMAIN-F3 — Directory/ticket evidence and lab-readiness capstone

Draft paper K11 support after [directory foundations](DOMAIN-FOUNDATIONS-01.md) and [Kerberos flow](KERBEROS-FOUNDATIONS-02.md). Not a canonical capstone, ticket test or approved domain deployment. Read only the [12 invented cases](../fixtures/domain-foundations/cases.json). Their supplied facts are not logs from a real environment.

## Case matrix
For D01-D12 record the stage, supplied facts, claim, bounded conclusion, missing evidence and scope/privacy decision. Distinguish unsupported inference from a permitted operation expressly supplied as completed. Do not infer a whole successful exchange from a single ticket event.

| Case | Stage / supplied fact | Claim | Supported / unsupported / stop | Missing evidence or next decision |
|---|---|---|---|---|
| D01 | | | | |
| D02 | | | | |
| D03 | | | | |
| D04 | | | | |
| D05 | | | | |
| D06 | | | | |
| D07 | | | | |
| D08 | | | | |
| D09 | | | | |
| D10 | | | | |
| D11 | | | | |
| D12 | | | | |

## Connected narrative
Build one fictional path: subject/group → delegated directory task → authentication stage → target service → requested application operation. Mark each edge as supplied, missing or assumed. State why the final authorisation decision is not provided by a TGT/service ticket. Include one allowed selected operation, one excluded object and one failure with multiple possible explanations. Request missing evidence on paper; do not run a diagnostic or discover extra objects.

## Future lab specification — design only
Candidate roles to review include a domain controller/KDC/directory, a joined learner workstation and a member/application service. This is not a prescribed VM count or measured hardware minimum; whether roles can be combined, what versions/architectures work and which resources/licences are required must be established by supported reproduction. No domain name, address, credentials, installer or join script is assigned here.

Before an actual lab, record responsible approval, owned systems, valid media/licensing, exact versions and CPU/virtualisation route, measured resources, synthetic identities, isolation and permitted connectivity, provisioning/transfer, scope/actions/budgets, support/incident contacts, private evidence/retention and recovery. Include legitimate baseline authentication/authorisation, explainable permitted diagnostics and actual post-restore checks. Missing items remain BLOCKED. Do not buy licences, use a trial/cloud tenant, join a host or query an organisational domain as a workaround.

The earlier Windows workgroup brief does not approve domain changes. Do not collect real tickets, hashes, keys, directory dumps or personal identifiers to complete the paper work. Redacting a display name does not make credential-bearing material safe to publish.

## Review and limits
Submit fictional diagrams, case reasoning, uncertainty, a scope/privacy decision and readiness blockers. Use the [instructor guide](DOMAIN-FOUNDATIONS-INSTRUCTOR.md) after independent predictions. No pass mark, award, automatic progress or restricted-domain access is defined. Paper completion is not practical AD/Kerberos or certification competence. See [bounded validation](DOMAIN-FOUNDATIONS-VALIDATION.md).
