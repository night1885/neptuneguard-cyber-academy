export const SOC_COURSE = {
  "key": "soc-analyst",
  "title": "SOC Analyst and Incident Response",
  "modules": [
    {
      "courseKey": "soc-analyst",
      "number": 1,
      "title": "SOC Workflow and Alert Triage",
      "badgeKey": "soc-analyst-1",
      "badgeName": "SOC Analyst: SOC Workflow and Alert Triage",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": null,
      "overview": "Distinguish an alert from a confirmed incident and document an initial triage decision.",
      "learningObjectives": [
        "Distinguish an alert from a confirmed incident and document an initial triage decision.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Alert versus incident",
          "text": "An alert is a signal requiring review, not proof of compromise. Validate the source, affected asset, time, and supporting evidence."
        },
        {
          "title": "Priority and ownership",
          "text": "Use the organization's documented severity criteria and escalation route. Record impact, urgency, owner, and the next evidence request."
        }
      ],
      "lessonCommands": [
        "cat evidence.log"
      ],
      "lab": {
        "title": "SOC Workflow and Alert Triage Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m1",
          "cd ~/neptuneguard-soc-m1",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf '2026-01-01T10:00:00Z alert=A-101 asset=workstation-7 rule=multiple-auth-failures\\n2026-01-01T10:01:00Z context=maintenance-window status=unverified\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "cat evidence.log"
        ],
        "checks": [
          "Identify A-101, the asset, and the UTC timestamps.",
          "Write an initial assessment with unknowns and a next evidence request; do not declare compromise."
        ]
      },
      "hint": "Validate context and evidence before concluding that an incident occurred.",
      "quiz": {
        "question": "What is the best first response to an unverified alert?",
        "answers": [
          {
            "id": "a",
            "label": "A. Validate context and supporting evidence",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Declare compromise immediately",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Delete the logs",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Disable every account",
            "correct": false
          }
        ],
        "correctExplanation": "Validate context and evidence before concluding that an incident occurred.",
        "incorrectExplanation": "That conclusion is not supported. Validate context and evidence before concluding that an incident occurred."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 2,
      "title": "Logs, Events, and Timeline Building",
      "badgeKey": "soc-analyst-2",
      "badgeName": "SOC Analyst: Logs, Events, and Timeline Building",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 1,
      "overview": "Build an ordered timeline while keeping source evidence separate from analysis.",
      "learningObjectives": [
        "Build an ordered timeline while keeping source evidence separate from analysis.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Time context",
          "text": "Record timezone and source. This fixture uses fixed-width UTC timestamps, so lexical sorting gives chronological order; mixed timezones or formats require normalization."
        },
        {
          "title": "Preservation",
          "text": "Keep the source file unchanged. Label derived timelines and record source references. Missing events or clock errors limit conclusions."
        }
      ],
      "lessonCommands": [
        "sort evidence.log > timeline.txt",
        "cat timeline.txt",
        "sha256sum --check original.sha256"
      ],
      "lab": {
        "title": "Logs, Events, and Timeline Building Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m2",
          "cd ~/neptuneguard-soc-m2",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf '2026-01-01T10:03:00Z host=workstation-7 event=session-end\\n2026-01-01T10:01:00Z host=workstation-7 event=auth-failure\\n2026-01-01T10:02:00Z host=workstation-7 event=auth-success\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "sort evidence.log > timeline.txt",
          "cat timeline.txt",
          "sha256sum --check original.sha256"
        ],
        "checks": [
          "Confirm the order is failure, success, session end.",
          "Confirm the original checksum still matches.",
          "Explain why event order alone does not identify an attacker."
        ]
      },
      "hint": "Normalize time context and retain provenance. This fixture is already consistently formatted UTC.",
      "quiz": {
        "question": "What makes a combined timeline more reliable?",
        "answers": [
          {
            "id": "a",
            "label": "A. Ignoring timezones",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. Normalizing times and retaining sources",
            "correct": true
          },
          {
            "id": "c",
            "label": "C. Editing originals to match a theory",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Sorting arbitrary date formats blindly",
            "correct": false
          }
        ],
        "correctExplanation": "Normalize time context and retain provenance. This fixture is already consistently formatted UTC.",
        "incorrectExplanation": "That conclusion is not supported. Normalize time context and retain provenance. This fixture is already consistently formatted UTC."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 3,
      "title": "Authentication and Account Activity",
      "badgeKey": "soc-analyst-3",
      "badgeName": "SOC Analyst: Authentication and Account Activity",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 2,
      "overview": "Correlate fictional authentication events without treating failure as proof of compromise.",
      "learningObjectives": [
        "Correlate fictional authentication events without treating failure as proof of compromise.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Correlation",
          "text": "Compare account, source, host, outcome, and time. A success after failures warrants context checks, not an automatic compromise finding."
        },
        {
          "title": "Alternative explanations",
          "text": "User mistakes, automation, and authorized activity may explain events. Request identity-provider, MFA, and approved-change context when available."
        }
      ],
      "lessonCommands": [
        "grep -nF 'user=analyst-demo' evidence.log",
        "grep -cF 'outcome=failure' evidence.log"
      ],
      "lab": {
        "title": "Authentication and Account Activity Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m3",
          "cd ~/neptuneguard-soc-m3",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf '2026-01-01T10:01:00Z user=analyst-demo src=192.0.2.20 outcome=failure\\n2026-01-01T10:02:00Z user=analyst-demo src=192.0.2.20 outcome=failure\\n2026-01-01T10:03:00Z user=analyst-demo src=192.0.2.20 outcome=success\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "grep -nF 'user=analyst-demo' evidence.log",
          "grep -cF 'outcome=failure' evidence.log"
        ],
        "checks": [
          "Confirm two failures and one success.",
          "Record an observation, a hypothesis, and one missing context source separately."
        ]
      },
      "hint": "The fixture establishes two failures followed by success. It does not establish compromise, identity, or MFA bypass.",
      "quiz": {
        "question": "What do these three events establish?",
        "answers": [
          {
            "id": "a",
            "label": "A. The account is certainly compromised",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. The source identifies a real person",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Two failures then success; context needed",
            "correct": true
          },
          {
            "id": "d",
            "label": "D. MFA was bypassed",
            "correct": false
          }
        ],
        "correctExplanation": "The fixture establishes two failures followed by success. It does not establish compromise, identity, or MFA bypass.",
        "incorrectExplanation": "That conclusion is not supported. The fixture establishes two failures followed by success. It does not establish compromise, identity, or MFA bypass."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 4,
      "title": "Network and DNS Investigation",
      "badgeKey": "soc-analyst-4",
      "badgeName": "SOC Analyst: Network and DNS Investigation",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 3,
      "overview": "Connect fictional DNS and network observations while separating resolution from communication.",
      "learningObjectives": [
        "Connect fictional DNS and network observations while separating resolution from communication.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "DNS limitations",
          "text": "A DNS response does not prove a later connection. A connection does not prove malicious intent or data theft."
        },
        {
          "title": "Correlation limits",
          "text": "Compare host, destination, time, and available telemetry. Traffic volume and a domain name alone do not establish exfiltration."
        }
      ],
      "lessonCommands": [
        "grep -nF 'type=dns' evidence.log",
        "grep -nF 'dst=192.0.2.50' evidence.log"
      ],
      "lab": {
        "title": "Network and DNS Investigation Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m4",
          "cd ~/neptuneguard-soc-m4",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf '2026-01-01T10:04:00Z host=workstation-7 type=dns query=updates.example answer=192.0.2.50\\n2026-01-01T10:05:00Z host=workstation-7 type=connection dst=192.0.2.50 port=443 bytes=2048\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "grep -nF 'type=dns' evidence.log",
          "grep -nF 'dst=192.0.2.50' evidence.log"
        ],
        "checks": [
          "Identify the DNS answer and the separate connection event.",
          "List missing process, application, and content context.",
          "Do not resolve, scan, or connect to any destination."
        ]
      },
      "hint": "A DNS response records resolution information; it does not by itself prove a connection or exfiltration.",
      "quiz": {
        "question": "What does a DNS response alone prove?",
        "answers": [
          {
            "id": "a",
            "label": "A. Data was stolen",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. A process executed malware",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. A connection completed",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. A resolution response was recorded",
            "correct": true
          }
        ],
        "correctExplanation": "A DNS response records resolution information; it does not by itself prove a connection or exfiltration.",
        "incorrectExplanation": "That conclusion is not supported. A DNS response records resolution information; it does not by itself prove a connection or exfiltration."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 5,
      "title": "Endpoint and Process Investigation",
      "badgeKey": "soc-analyst-5",
      "badgeName": "SOC Analyst: Endpoint and Process Investigation",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 4,
      "overview": "Review a synthetic process chain and identify additional evidence needed.",
      "learningObjectives": [
        "Review a synthetic process chain and identify additional evidence needed.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Process context",
          "text": "Parent-child relationships, command lines, user, host, and time support investigation. Familiar executable names can be used legitimately or misused."
        },
        {
          "title": "Avoid execution",
          "text": "Treat suspicious content as evidence. Do not execute samples or copied command lines. Request hashes, signatures, and approved activity context through authorized procedures."
        }
      ],
      "lessonCommands": [
        "grep -nF 'parent=410' evidence.log",
        "cat evidence.log"
      ],
      "lab": {
        "title": "Endpoint and Process Investigation Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m5",
          "cd ~/neptuneguard-soc-m5",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf '2026-01-01T10:06:00Z host=workstation-7 pid=410 parent=300 process=shell user=analyst-demo\\n2026-01-01T10:06:01Z host=workstation-7 pid=411 parent=410 process=download-client user=analyst-demo\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "grep -nF 'parent=410' evidence.log",
          "cat evidence.log"
        ],
        "checks": [
          "Identify process 411 as a child of 410.",
          "Explain why the process names alone do not prove malware.",
          "Record additional evidence requests without running a sample."
        ]
      },
      "hint": "Preserve the command line as evidence and investigate within authorized procedures; do not execute it.",
      "quiz": {
        "question": "What should an analyst do with a suspicious command line?",
        "answers": [
          {
            "id": "a",
            "label": "A. Run it to see what happens",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. Preserve and investigate without executing",
            "correct": true
          },
          {
            "id": "c",
            "label": "C. Post it with credentials publicly",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Delete all related evidence",
            "correct": false
          }
        ],
        "correctExplanation": "Preserve the command line as evidence and investigate within authorized procedures; do not execute it.",
        "incorrectExplanation": "That conclusion is not supported. Preserve the command line as evidence and investigate within authorized procedures; do not execute it."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 6,
      "title": "Incident Classification and Escalation",
      "badgeKey": "soc-analyst-6",
      "badgeName": "SOC Analyst: Incident Classification and Escalation",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 5,
      "overview": "Prepare an evidence-based handoff using a fictional severity policy.",
      "learningObjectives": [
        "Prepare an evidence-based handoff using a fictional severity policy.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Policy-driven classification",
          "text": "This exercise uses a fictional policy, not a universal severity standard. Real classification follows the organization's criteria and current evidence."
        },
        {
          "title": "Actionable handoff",
          "text": "Include impact, scope, observations, confidence, unknowns, evidence references, owner, and the requested decision. Avoid unsupported attribution."
        }
      ],
      "lessonCommands": [
        "cat evidence.log"
      ],
      "lab": {
        "title": "Incident Classification and Escalation Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m6",
          "cd ~/neptuneguard-soc-m6",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf 'Fictional policy: active service outage -> urgent escalation\\nCase: payment-demo unavailable; outage confirmed; cause unknown\\nOwner: on-call incident lead\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "cat evidence.log"
        ],
        "checks": [
          "Draft a handoff citing the confirmed outage and unknown cause.",
          "Request urgent escalation under the provided policy.",
          "Do not name an attacker without evidence."
        ]
      },
      "hint": "The fixture policy calls for urgent escalation of an active outage, while the cause remains unknown.",
      "quiz": {
        "question": "Under this fictional policy, how should the confirmed outage be handled?",
        "answers": [
          {
            "id": "a",
            "label": "A. Ignore it until attribution is known",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. Assume a named attacker",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Escalate urgently; state cause unknown",
            "correct": true
          },
          {
            "id": "d",
            "label": "D. Delete the ticket",
            "correct": false
          }
        ],
        "correctExplanation": "The fixture policy calls for urgent escalation of an active outage, while the cause remains unknown.",
        "incorrectExplanation": "That conclusion is not supported. The fixture policy calls for urgent escalation of an active outage, while the cause remains unknown."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 7,
      "title": "Containment Planning and Evidence Handling",
      "badgeKey": "soc-analyst-7",
      "badgeName": "SOC Analyst: Containment Planning and Evidence Handling",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 6,
      "overview": "Write an authorized containment proposal and an evidence-handling record.",
      "learningObjectives": [
        "Write an authorized containment proposal and an evidence-handling record.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Containment tradeoffs",
          "text": "Containment aims to limit spread and damage. Consider business impact, authorization, evidence preservation, validation, and rollback; do not apply changes in this lab."
        },
        {
          "title": "Evidence records",
          "text": "Record what was collected, source, collector, collection time, and handling. Hashes help detect changes but do not authenticate a source or replace appropriate custody procedures."
        }
      ],
      "lessonCommands": [
        "cp evidence.log analysis-copy.log",
        "sha256sum evidence.log analysis-copy.log",
        "sha256sum --check original.sha256"
      ],
      "lab": {
        "title": "Containment Planning and Evidence Handling Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m7",
          "cd ~/neptuneguard-soc-m7",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf 'Case: workstation-7 suspicious activity under investigation\\nProposal only: isolate host after incident-lead authorization\\nEvidence: synthetic fixture; not a forensic disk image\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "cp evidence.log analysis-copy.log",
          "sha256sum evidence.log analysis-copy.log",
          "sha256sum --check original.sha256"
        ],
        "checks": [
          "Confirm both copies have equal digests and the original is unchanged.",
          "Write a proposal with approver, impact, evidence needs, validation, and rollback.",
          "Record fixture provenance; do not isolate a real host."
        ]
      },
      "hint": "The digest check supports byte-integrity comparison, not authenticity, harmlessness, or complete chain of custody.",
      "quiz": {
        "question": "What does a matching SHA-256 digest establish here?",
        "answers": [
          {
            "id": "a",
            "label": "A. The file is authentic and harmless",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. A complete legal chain of custody",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. The bytes match the recorded baseline",
            "correct": true
          },
          {
            "id": "d",
            "label": "D. The host is contained",
            "correct": false
          }
        ],
        "correctExplanation": "The digest check supports byte-integrity comparison, not authenticity, harmlessness, or complete chain of custody.",
        "incorrectExplanation": "That conclusion is not supported. The digest check supports byte-integrity comparison, not authenticity, harmlessness, or complete chain of custody."
      }
    },
    {
      "courseKey": "soc-analyst",
      "number": 8,
      "title": "SOC Investigation Capstone",
      "badgeKey": "soc-analyst-8",
      "badgeName": "SOC Analyst: SOC Investigation Capstone",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 7,
      "overview": "Correlate a fictional case and produce a bounded investigation report.",
      "learningObjectives": [
        "Correlate a fictional case and produce a bounded investigation report.",
        "Separate observations, hypotheses, and missing evidence.",
        "Document a scoped, authorized next step."
      ],
      "keyIdeas": [
        {
          "title": "Evidence-based conclusions",
          "text": "Connect events by host, account, destination, and timestamp. Separate observed facts from hypotheses and state missing telemetry."
        },
        {
          "title": "Closure and learning",
          "text": "Propose authorized next steps, recovery verification, and follow-up improvements. This self-reported practice exercise is not an independent professional certification."
        }
      ],
      "lessonCommands": [
        "sort evidence.log > timeline.txt",
        "cat timeline.txt",
        "sha256sum --check original.sha256"
      ],
      "lab": {
        "title": "SOC Investigation Capstone Practice Lab",
        "safetyNotice": "Use Bash in your own Linux VM or WSL. All data is fictional. Commands write only inside the named practice directory and replace previous practice files there. No sudo, external queries, scanning, malware execution, real credentials, or live containment. Stop if required tools are missing.",
        "commands": [
          "mkdir -p ~/neptuneguard-soc-m8",
          "cd ~/neptuneguard-soc-m8",
          "printf '%s\\n' 'Synthetic training fixture; no real learner or incident data.' > README.txt",
          "printf '2026-01-01T10:01:00Z host=workstation-7 user=analyst-demo event=auth-failure\\n2026-01-01T10:02:00Z host=workstation-7 user=analyst-demo event=auth-success\\n2026-01-01T10:03:00Z host=workstation-7 event=dns query=updates.example answer=192.0.2.50\\n2026-01-01T10:04:00Z host=workstation-7 event=connection dst=192.0.2.50 port=443\\n' > evidence.log",
          "sha256sum evidence.log > original.sha256",
          "sort evidence.log > timeline.txt",
          "cat timeline.txt",
          "sha256sum --check original.sha256"
        ],
        "checks": [
          "Write a report with timeline, evidence references, scope, confidence, and unknowns.",
          "State that compromise and exfiltration are not established by this fixture alone.",
          "Propose an evidence request and approved response path.",
          "Confirm the original fixture checksum remains valid."
        ]
      },
      "hint": "The fixture supports correlation of observations and further investigation, not definitive attribution or proof of compromise.",
      "quiz": {
        "question": "Which capstone conclusion is supported?",
        "answers": [
          {
            "id": "a",
            "label": "A. Malware and exfiltration are proven",
            "correct": false
          },
          {
            "id": "b",
            "label": "B. Related events need more context",
            "correct": true
          },
          {
            "id": "c",
            "label": "C. A specific person is the attacker",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. All systems are unaffected",
            "correct": false
          }
        ],
        "correctExplanation": "The fixture supports correlation of observations and further investigation, not definitive attribution or proof of compromise.",
        "incorrectExplanation": "That conclusion is not supported. The fixture supports correlation of observations and further investigation, not definitive attribution or proof of compromise."
      }
    }
  ]
};
