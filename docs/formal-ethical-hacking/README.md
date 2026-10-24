# Formal ethical hacking — draft learning route

Authoring index, not a published course or implemented learner interface. All linked lessons remain drafts subject to their own validation gates. Students build and operate their own authorized practice environments; academy-hosted labs are deferred. Community Learning is excluded.

## How to use this index
The numbered sections propose a reading route through currently authored material. A filename or link is not completion evidence, tested hardware support, enrolment, restricted-lab authorization or an award. Read each lesson's actual prerequisites and scope. This index does not override them or implement progression.

The course is not complete merely because these documents exist. This is not a claim of production readiness, certification alignment or accreditation. Earlier conversation prototypes and generated test artifacts are not silently imported.

## 1. Authorization, host setup and terminal foundations
| Document | Focus |
|---|---|
| [EH-LAB-00](lessons/EH-LAB-00.md) | Authorization and readiness |
| [EH-LAB-01](lessons/EH-LAB-01.md) | Host virtualization installation |
| [EH-LAB-02](lessons/EH-LAB-02.md) | Clean offline learner guest |
| [EH-LINUX-01](lessons/EH-LINUX-01.md) | Terminal, paths and safe file handling |
| [EH-LINUX-02](lessons/EH-LINUX-02.md) | File permissions |
| [EH-LINUX-03](lessons/EH-LINUX-03.md) | Output, errors and exit status |

The Linux foundations fit after guest preparation and before practical networking. Software provisioning and material transfer must use a reviewed supported route; the index supplies neither an installer nor universal hardware requirements.

## 2. Internal network and protocol observation
| Document | Focus |
|---|---|
| [EH-LAB-03](lessons/EH-LAB-03.md) | Two clean VMs and controlled recovery |
| [EH-LAB-04](lessons/EH-LAB-04.md) | Bounded HTTP observation |
| [EH-LAB-05](lessons/EH-LAB-05.md) | Evidence and reporting |
| [EH-NET-01](lessons/EH-NET-01.md) | Prefixes and route decisions |
| [EH-NET-02](lessons/EH-NET-02.md) | TCP endpoints and application observations |
| [EH-NET-03](lessons/EH-NET-03.md) | DNS concepts and failure boundaries |
| [Networking capstone](lessons/EH-NET-CAPSTONE.md) | Bounded service troubleshooting |

A completed setup page or a failed ping is not proof of isolation. Practical permissions remain specific to each released exercise.

## 3. Web and transport concepts
| Document | Focus |
|---|---|
| [EH-WEB-01](lessons/EH-WEB-01.md) | HTTP methods, headers and status |
| [EH-WEB-02](lessons/EH-WEB-02.md) | Cookies, sessions and evidence privacy |
| [EH-WEB-03](lessons/EH-WEB-03.md) | Authentication versus authorization |
| [EH-TLS-01](lessons/EH-TLS-01.md) | Transport protection boundaries |
| [EH-TLS-02](lessons/EH-TLS-02.md) | Certificate identity, trust and time |
| [Web reasoning capstone](lessons/EH-WEB-CAPSTONE.md) | Fictional access-control analysis |

TLS lessons are conceptual and do not convert the clean HTTP fixture into HTTPS. Paper scenarios are not executed practical evidence.

## 4. Offline security repair practicals
| Document | Focus |
|---|---|
| [EH-WEB-04](lessons/EH-WEB-04.md) | Ownership decisions |
| [EH-WEB-05](lessons/EH-WEB-05.md) | SQL values versus query structure |
| [EH-WEB-06](lessons/EH-WEB-06.md) | HTML text output encoding |
| [Integrated repair capstone](lessons/EH-WEB-PRACTICAL-CAPSTONE.md) | Assess the three preceding fixtures |
| [EH-WEB-07](lessons/EH-WEB-07.md) | Filesystem containment |
| [EH-WEB-08](lessons/EH-WEB-08.md) | Editable-field policy |

The integrated capstone currently covers EH-WEB-04 through EH-WEB-06 only. Later practicals are not silently added to its rubric. Fixtures intentionally contain defects, must remain outside academy runtime and must not be deployed. Their visible starter tests are expected to fail before repair.

## 5. Assessment planning and vulnerability triage
| Document | Focus |
|---|---|
| [EH-ASSESS-01](lessons/EH-ASSESS-01.md) | Objective-driven planning |
| [EH-ASSESS-02](lessons/EH-ASSESS-02.md) | Single-host, single-port connect check |
| [EH-ASSESS-03](lessons/EH-ASSESS-03.md) | Advisory applicability and backports |
| [EH-ASSESS-04](lessons/EH-ASSESS-04.md) | Severity, priority and confidence |

The Nmap exercise requires its own actual lab authorization; it is not included in earlier GET/HEAD-only scopes. No scan has been executed merely by authoring these guides.

## 6. Evidence correlation and test design
| Document | Focus |
|---|---|
| [EH-EVIDENCE-01](lessons/EH-EVIDENCE-01.md) | Synthetic timeline and event correlation |
| [EH-MODEL-01](lessons/EH-MODEL-01.md) | Assets, flows and trust boundaries |
| [EH-MODEL-02](lessons/EH-MODEL-02.md) | Threat-to-test traceability |

The fictional application model is not the academy's architecture. The log exercise is not live monitoring or learner surveillance.

## Supporting assessment material
- [Network finding and retest worksheet](lessons/NETWORK-FINDING-AND-RETEST.md)
- [Web report template](lessons/WEB-PRACTICAL-REPORT-TEMPLATE.md)
- [Draft web rubric](lessons/WEB-PRACTICAL-DRAFT-RUBRIC.md)
- [Fictional advisory cases](lessons/VULNERABILITY-TRIAGE-CASEPACK.md) and [triage worksheet](lessons/TRIAGE-EVIDENCE-WORKSHEET.md)
- [TLS cases](lessons/TLS-CERTIFICATE-CASEPACK.md) and [verification worksheet](lessons/TLS-VERIFICATION-WORKSHEET.md)
- [Timeline worksheet](lessons/LOG-TIMELINE-WORKSHEET.md)
- [Fictional modelling scenario](lessons/THREAT-MODEL-SCENARIO.md) and [traceability worksheet](lessons/THREAT-TEST-TRACEABILITY.md)

## Validation and authoring
Read the lesson-specific validation records before making readiness claims. [Home-lab validation](lessons/HOME-LAB-VALIDATION.md) preserves the supported-hardware and end-to-end requirements. The existing [home-lab manifest](home-lab-manifest.json) remains unchanged, conservative and draft-not-published; it is not a complete catalogue of these newer drafts.

Maintainers with a repository checkout and Python 3.9+ can run `python3 docs/formal-ethical-hacking/authoring/check_index.py` from the repository root. To run its isolated unit tests: `cd docs/formal-ethical-hacking/authoring` then `python3 -m unittest -v test_check_index`. These are maintainer terminal instructions, not learner-interface commands.

The checker examines simple inline local-file links in this README only. It does not execute teaching fixtures, fetch websites, verify fragments, validate prerequisites or approve release. See [index-check notes](authoring/INDEX-VALIDATION.md). No learner slash-command navigation or modal interface is introduced.
