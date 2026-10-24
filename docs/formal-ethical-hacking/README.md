# Formal ethical hacking — draft learning route

Authoring index, not a published course or implemented learner interface. All linked lessons remain drafts subject to their own validation gates. Students build and operate their own authorized practice environments; academy-hosted labs are deferred. Community Learning is excluded.

## How to use this index
The numbered sections propose a reading route through currently authored material. A filename or link is not completion evidence, tested hardware support, enrolment, restricted-lab authorization or an award. Read each lesson's actual prerequisites and scope. This index does not override them or implement progression.

The course is not complete merely because these documents exist. This is not a claim of production readiness, certification alignment or accreditation. Earlier conversation prototypes and generated test artifacts are not silently imported.

## Begin with the first practical journey
Read [Start here](START-HERE.md) for the gated route from authorization and clean guest preparation through terminal foundations, two-VM HTTP observation and reporting. Use the blank [first-practical worksheet](FIRST-PRACTICAL-WORKSHEET.md) to distinguish completed, blocked and unattempted work. These documents do not implement a private submission service or approve a real learner pilot.

Maintainers should use the [first-journey pilot plan](authoring/FIRST-JOURNEY-PILOT.md) before claiming end-to-end reproduction. Missing supported setup routes, provisioning instructions, actual support/incident contacts or approved private evidence handling remain blockers, not permission to improvise.

## 1. Authorization, host setup and terminal foundations
| Document | Focus |
|---|---|
| [EH-LAB-00](lessons/EH-LAB-00.md) | Authorization and readiness |
| [EH-LAB-01](lessons/EH-LAB-01.md) | Host virtualization installation |
| [EH-LAB-02](lessons/EH-LAB-02.md) | Clean offline learner guest |
| [EH-LINUX-01](lessons/EH-LINUX-01.md) | Terminal, paths and safe file handling |
| [EH-LINUX-02](lessons/EH-LINUX-02.md) | File permissions |
| [EH-LINUX-03](lessons/EH-LINUX-03.md) | Output, errors and exit status |
| [EH-LINUX-04](lessons/EH-LINUX-04.md) | Observe a bounded child process you started |

The first three Linux lessons fit after guest preparation and before practical networking. EH-LINUX-04 additionally introduces its own narrowly scoped process observation and stop rules. Software provisioning and material transfer must use a reviewed supported route; the index supplies neither an installer nor universal hardware requirements.

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
| [EH-LINUX-05](lessons/EH-LINUX-05.md) | Relate the known local listener to its process |

A completed setup page or a failed ping is not proof of isolation. Practical permissions remain specific to each released exercise. EH-LINUX-05 requires EH-LINUX-04, EH-LAB-04 and EH-NET-02; it does not authorize new client requests, scanning, privilege escalation or stopping an unknown process.

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
If the Python in these practicals is unfamiliar, use the [guided Python reading bridge](lessons/PYTHON-READING-BRIDGE.md) after the Linux foundations and before independent repair work. Its small synthetic-record fixture is correct and its eight supplied tests are expected to pass. The [SQL reading bridge](lessons/SQL-READING-BRIDGE.md) supplies a separate correct in-memory example and six tests before independent query repair. These supporting walkthroughs do not replace existing web-capstone or practical prerequisites.

| Document | Focus |
|---|---|
| [EH-WEB-04](lessons/EH-WEB-04.md) | Ownership decisions |
| [EH-WEB-05](lessons/EH-WEB-05.md) | SQL values versus query structure |
| [EH-WEB-06](lessons/EH-WEB-06.md) | HTML text output encoding |
| [Integrated repair capstone](lessons/EH-WEB-PRACTICAL-CAPSTONE.md) | Assess the three preceding fixtures |
| [EH-WEB-07](lessons/EH-WEB-07.md) | Filesystem containment |
| [EH-WEB-08](lessons/EH-WEB-08.md) | Editable-field policy |

Optional paper extensions:
- [API authorization case pack](lessons/API-AUTHORIZATION-CASEPACK.md) and [worksheet](lessons/API-AUTHORIZATION-WORKSHEET.md): object-, property- and function-level decisions, linked from EH-WEB-08.
- [Output-context case pack](lessons/OUTPUT-CONTEXT-CASEPACK.md) and [worksheet](lessons/OUTPUT-CONTEXT-WORKSHEET.md): HTML text, attributes, URLs, JavaScript, permitted formatting and presentation choices, linked from EH-WEB-06.

These extensions add no live targets, browser execution or testing permission. The integrated capstone currently covers EH-WEB-04 through EH-WEB-06 only; later practicals and paper packs are not silently added to its rubric. Security-repair fixtures intentionally contain defects, must remain outside academy runtime and must not be deployed. Their visible starter tests are expected to fail before repair; the correct Python- and SQL-reading starters instead should pass unchanged.

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
| [EH-EVIDENCE-02](lessons/EH-EVIDENCE-02.md) | SHA-256 byte consistency, working-copy change and handling records |
| [EH-MODEL-01](lessons/EH-MODEL-01.md) | Assets, flows and trust boundaries |
| [EH-MODEL-02](lessons/EH-MODEL-02.md) | Threat-to-test traceability |

The fictional application model is not the academy's architecture. The log exercise is not live monitoring or learner surveillance. EH-EVIDENCE-02 requires EH-EVIDENCE-01 and Python reading support. Its tiny synthetic-file exercise does not establish provenance, factual truth, legal admissibility, forensic acquisition or a real evidence-transfer service.

## 7. Offline input-validation automation
| Document | Focus |
|---|---|
| [EH-AUTO-01](lessons/EH-AUTO-01.md) | Validate an exact address/port input pair without performing a network action |

Requires EH-ASSESS-01, EH-NET-01 and Python reading support. Parse success, fictional pair membership, actual authorization and execution are different decisions. The predicate opens no sockets and must not be connected to a scanner, HTTP client, bot or academy authorization adapter. A True result is not permission or proof of reachability.

## Supporting assessment material
- [Network finding and retest worksheet](lessons/NETWORK-FINDING-AND-RETEST.md)
- [Process and service worksheet](lessons/PROCESS-SERVICE-WORKSHEET.md)
- [Web report template](lessons/WEB-PRACTICAL-REPORT-TEMPLATE.md)
- [Draft web rubric](lessons/WEB-PRACTICAL-DRAFT-RUBRIC.md)
- [Fictional advisory cases](lessons/VULNERABILITY-TRIAGE-CASEPACK.md) and [triage worksheet](lessons/TRIAGE-EVIDENCE-WORKSHEET.md)
- [TLS cases](lessons/TLS-CERTIFICATE-CASEPACK.md) and [verification worksheet](lessons/TLS-VERIFICATION-WORKSHEET.md)
- [Timeline worksheet](lessons/LOG-TIMELINE-WORKSHEET.md)
- [Synthetic evidence handoff worksheet](lessons/EVIDENCE-HANDOFF-WORKSHEET.md)
- [Fictional modelling scenario](lessons/THREAT-MODEL-SCENARIO.md) and [traceability worksheet](lessons/THREAT-TEST-TRACEABILITY.md)

## Validation and authoring
Read lesson-specific validation records before making readiness claims. [Home-lab validation](lessons/HOME-LAB-VALIDATION.md) preserves supported-hardware and end-to-end requirements. The existing [home-lab manifest](home-lab-manifest.json) remains conservative and draft-not-published; it is not a complete catalogue of these newer drafts.

The separate [curriculum catalogue](curriculum-catalogue.json) lists 36 draft lesson/capstone IDs and curated prerequisite relationships. This index revision adds the previously omitted EH-LINUX-04, EH-LINUX-05, EH-EVIDENCE-02 and EH-AUTO-01 links so all 36 catalogue entries have a reading link. Supporting bridges, worksheets and case packs are not extra canonical entries. See [catalogue maintainer notes](authoring/CATALOGUE-NOTES.md) for structural and semantic limits. This remains a documentation reconciliation, not an implemented automatic completeness or progression rule.

Maintainers with a trusted repository checkout and Python 3.9+ can run `python3 docs/formal-ethical-hacking/authoring/check_index.py` from the repository root. Its isolated tests run from the authoring directory with `python3 -m unittest -v test_check_index`. These are maintainer terminal instructions, not learner-interface commands.

The index checker examines simple inline local-file links in this README only. It does not execute teaching fixtures, fetch websites, verify fragments, validate prerequisites or approve release. See [index-check notes](authoring/INDEX-VALIDATION.md).

For selected combined checks, run `python3 -B docs/formal-ethical-hacking/authoring/check_authoring.py` from the repository root and read [combined-check instructions and execution limits](authoring/AUTHORING-CHECKS.md). The runner uses an explicit maintainer-test allowlist, not broad fixture discovery. It does not execute the reading fixtures or inspect every supporting document.

The separate [Python bridge regression notes](authoring/PYTHON-BRIDGE-REGRESSION.md) describe a standalone named maintainer test covering the original starter, two supplemental cases, a temporary mutation and restoration. That module is not silently added to the combined-runner allowlist. Its results are selected-file local checks, not GitHub CI or student-hardware validation.

No new fixture execution or full-checkout validation was performed for this index-only revision. Existing lesson-specific author records retain their original scope and limitations. These Markdown links are authoring navigation, not the finished learner workspace. No learner slash-command navigation or modal interface is introduced.
