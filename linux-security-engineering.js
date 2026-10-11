export const SECURITY_COURSE = {
  "key": "linux-security-engineering",
  "title": "Linux Security Engineering",
  "modules": [
    {
      "courseKey": "linux-security-engineering",
      "number": 1,
      "title": "Threat Modeling and Least Privilege",
      "badgeKey": "linux-security-1",
      "badgeName": "Linux Security: Threat Modeling and Least Privilege",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": null,
      "overview": "Define assets, trust boundaries, and minimum required access before applying controls.",
      "learningObjectives": [
        "Define assets, trust boundaries, and minimum required access before applying controls.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Threat model",
          "text": "Identify what needs protection, who can access it, and plausible failure or misuse paths. Controls should address explicit risks."
        },
        {
          "title": "Least privilege",
          "text": "Grant only the access needed for an approved task. Account identity, file permissions, network exposure, and secret access all matter."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m1",
        "cd ~/neptuneguard-security-m1",
        "printf 'Asset: fictional report\\nRisk: unintended readers\\nControl: restricted access\\n' > risk-plan.txt",
        "cat risk-plan.txt"
      ],
      "lab": {
        "title": "Threat Modeling and Least Privilege Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m1",
          "cd ~/neptuneguard-security-m1",
          "printf 'Asset: fictional report\\nRisk: unintended readers\\nControl: restricted access\\n' > risk-plan.txt",
          "cat risk-plan.txt"
        ],
        "checks": [
          "Describe one asset, risk, and matching control.",
          "Explain how to verify the control without exposing real data."
        ]
      },
      "hint": "Grant only task-required access. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "Which approach best follows least privilege?",
        "answers": [
          {
            "id": "a",
            "label": "A. Grant only task-required access",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Make every user an administrator",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Allow all inbound traffic",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Publish credentials",
            "correct": false
          }
        ],
        "correctExplanation": "Grant only task-required access. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. Grant only task-required access. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 2,
      "title": "Permission Hardening",
      "badgeKey": "linux-security-2",
      "badgeName": "Linux Security: Permission Hardening",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 1,
      "overview": "Apply restrictive modes to fictional files inside a private practice directory.",
      "learningObjectives": [
        "Apply restrictive modes to fictional files inside a private practice directory.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "File versus directory",
          "text": "A directory needs execute permission for traversal. Owner read/write/execute is 700 for a directory; owner read/write is 600 for a regular file."
        },
        {
          "title": "Limits",
          "text": "Mode bits are not encryption. Privileged users, ACLs, and other security mechanisms may affect access; do not claim a file is encrypted because its mode is restricted."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m2",
        "cd ~/neptuneguard-security-m2",
        "printf 'Fictional private report\\n' > report.txt",
        "chmod 700 .",
        "chmod 600 report.txt",
        "ls -ld .",
        "ls -l report.txt"
      ],
      "lab": {
        "title": "Permission Hardening Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m2",
          "cd ~/neptuneguard-security-m2",
          "printf 'Fictional private report\\n' > report.txt",
          "chmod 700 .",
          "chmod 600 report.txt",
          "ls -ld .",
          "ls -l report.txt"
        ],
        "checks": [
          "Confirm ordinary directory bits rwx------.",
          "Confirm ordinary file bits rw-------.",
          "Explain why permissions do not encrypt data."
        ]
      },
      "hint": "Sets owner read/write; not encryption. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "What does chmod 600 do to a regular file?",
        "answers": [
          {
            "id": "a",
            "label": "A. Sets owner read/write; not encryption",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Encrypts its contents",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Changes its owner",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Deletes its contents",
            "correct": false
          }
        ],
        "correctExplanation": "Sets owner read/write; not encryption. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. Sets owner read/write; not encryption. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 3,
      "title": "SSH Hardening Change Planning",
      "badgeKey": "linux-security-3",
      "badgeName": "Linux Security: SSH Hardening Change Planning",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 2,
      "overview": "Review a fictional SSH change plan without modifying or restarting a real server.",
      "learningObjectives": [
        "Review a fictional SSH change plan without modifying or restarting a real server.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Avoid lockout",
          "text": "SSH changes can remove remote access. Confirm alternative access, approved authentication, validation, and rollback before applying changes."
        },
        {
          "title": "Validation",
          "text": "sshd -t checks configuration validity, but does not prove users can authenticate. Includes and match blocks can affect effective behavior; a production change requires environment-specific review."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m3",
        "cd ~/neptuneguard-security-m3",
        "printf 'Fictional SSH change checklist\\nAlternative access confirmed\\nAuthentication tested\\nConfiguration validation planned\\nRollback prepared\\n' > ssh-plan.txt",
        "cat ssh-plan.txt"
      ],
      "lab": {
        "title": "SSH Hardening Change Planning Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m3",
          "cd ~/neptuneguard-security-m3",
          "printf 'Fictional SSH change checklist\\nAlternative access confirmed\\nAuthentication tested\\nConfiguration validation planned\\nRollback prepared\\n' > ssh-plan.txt",
          "cat ssh-plan.txt"
        ],
        "checks": [
          "Explain why an alternate access path matters.",
          "Distinguish syntax validity from successful authentication.",
          "Do not disable password access until approved replacement access has been verified."
        ]
      },
      "hint": "Replacement access and rollback. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "What should be verified before disabling an SSH authentication method?",
        "answers": [
          {
            "id": "a",
            "label": "A. Replacement access and rollback",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Only the file name",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. That all ports are open",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. That backups are deleted",
            "correct": false
          }
        ],
        "correctExplanation": "Replacement access and rollback. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. Replacement access and rollback. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 4,
      "title": "Network Exposure Review",
      "badgeKey": "linux-security-4",
      "badgeName": "Linux Security: Network Exposure Review",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 3,
      "overview": "Inspect your local listening sockets and plan minimal network exposure without changing firewall rules.",
      "learningObjectives": [
        "Inspect your local listening sockets and plan minimal network exposure without changing firewall rules.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Bind addresses",
          "text": "A service bound to loopback differs from a service bound to wildcard addresses. Binding is only one part of reachability."
        },
        {
          "title": "Reachability",
          "text": "Routing, firewalls, network boundaries, and service configuration also affect exposure. A socket listing alone cannot prove external reachability."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m4",
        "cd ~/neptuneguard-security-m4",
        "printf 'Exposure review: local inspection only\\n' > exposure-plan.txt",
        "command -v ss",
        "ss -ltn",
        "cat exposure-plan.txt"
      ],
      "lab": {
        "title": "Network Exposure Review Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m4",
          "cd ~/neptuneguard-security-m4",
          "printf 'Exposure review: local inspection only\\n' > exposure-plan.txt",
          "command -v ss",
          "ss -ltn",
          "cat exposure-plan.txt"
        ],
        "checks": [
          "Describe one local listener or report none.",
          "Explain which additional controls affect reachability.",
          "No external scanning or firewall changes are performed."
        ]
      },
      "hint": "No; routing and controls also matter. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "Does a local listening socket prove internet reachability?",
        "answers": [
          {
            "id": "a",
            "label": "A. No; routing and controls also matter",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Yes; always",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Only if chmod 777 is used",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. It proves encryption",
            "correct": false
          }
        ],
        "correctExplanation": "No; routing and controls also matter. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. No; routing and controls also matter. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 5,
      "title": "File Integrity and Trusted Baselines",
      "badgeKey": "linux-security-5",
      "badgeName": "Linux Security: File Integrity and Trusted Baselines",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 4,
      "overview": "Detect a change in a fictional file using a SHA-256 baseline.",
      "learningObjectives": [
        "Detect a change in a fictional file using a SHA-256 baseline.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Checksums",
          "text": "sha256sum computes a digest; --check compares files with a recorded baseline."
        },
        {
          "title": "Trusted baseline",
          "text": "A checksum does not authenticate the publisher if an attacker can replace both the file and its checksum. Protect baselines and use authenticated sources or signatures when appropriate."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m5",
        "cd ~/neptuneguard-security-m5",
        "printf 'Original fictional content\\n' > evidence.txt",
        "sha256sum evidence.txt > baseline.sha256",
        "sha256sum --check baseline.sha256",
        "printf 'Changed fictional content\\n' >> evidence.txt",
        "sha256sum --check baseline.sha256"
      ],
      "lab": {
        "title": "File Integrity and Trusted Baselines Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m5",
          "cd ~/neptuneguard-security-m5",
          "printf 'Original fictional content\\n' > evidence.txt",
          "sha256sum evidence.txt > baseline.sha256",
          "sha256sum --check baseline.sha256",
          "printf 'Changed fictional content\\n' >> evidence.txt",
          "sha256sum --check baseline.sha256"
        ],
        "checks": [
          "The first check succeeds.",
          "The second check intentionally fails after the change.",
          "Explain why a trusted baseline is necessary."
        ]
      },
      "hint": "An attacker could replace it too. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "What is the limitation of an untrusted checksum file?",
        "answers": [
          {
            "id": "a",
            "label": "A. An attacker could replace it too",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. It encrypts data automatically",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. It controls firewall policy",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. It proves authorship by itself",
            "correct": false
          }
        ],
        "correctExplanation": "An attacker could replace it too. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. An attacker could replace it too. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 6,
      "title": "Secrets Handling and Rotation",
      "badgeKey": "linux-security-6",
      "badgeName": "Linux Security: Secrets Handling and Rotation",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 5,
      "overview": "Use a fictional credential lifecycle plan without writing any real secrets.",
      "learningObjectives": [
        "Use a fictional credential lifecycle plan without writing any real secrets.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Handling",
          "text": "Never put real tokens, passwords, or connection strings in lessons, source commits, screenshots, or logs. Use access-controlled secret storage."
        },
        {
          "title": "Rotation",
          "text": "Create a replacement, update consumers, verify them, then revoke the old credential. Exposure remediation also requires checking access and dependent services."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m6",
        "cd ~/neptuneguard-security-m6",
        "printf 'Fictional lifecycle: replace -> update -> verify -> revoke\\nNo actual secret values stored here\\n' > rotation-plan.txt",
        "cat rotation-plan.txt",
        "chmod 600 rotation-plan.txt",
        "ls -l rotation-plan.txt"
      ],
      "lab": {
        "title": "Secrets Handling and Rotation Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m6",
          "cd ~/neptuneguard-security-m6",
          "printf 'Fictional lifecycle: replace -> update -> verify -> revoke\\nNo actual secret values stored here\\n' > rotation-plan.txt",
          "cat rotation-plan.txt",
          "chmod 600 rotation-plan.txt",
          "ls -l rotation-plan.txt"
        ],
        "checks": [
          "Explain why changing a URL does not necessarily rotate its password.",
          "List dependent consumers before revocation.",
          "Keep all actual secret values out of this exercise."
        ]
      },
      "hint": "Revoke the old credential. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "After replacement consumers are verified, what completes rotation?",
        "answers": [
          {
            "id": "a",
            "label": "A. Revoke the old credential",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Keep both forever without review",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Publish the old password",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Disable audit logs",
            "correct": false
          }
        ],
        "correctExplanation": "Revoke the old credential. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. Revoke the old credential. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 7,
      "title": "Security Logging and Evidence",
      "badgeKey": "linux-security-7",
      "badgeName": "Linux Security: Security Logging and Evidence",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 6,
      "overview": "Review fictional authentication events while separating observations from incident conclusions.",
      "learningObjectives": [
        "Review fictional authentication events while separating observations from incident conclusions.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Useful events",
          "text": "Security logs should support when, where, who, and what happened, with proportionate access controls and retention."
        },
        {
          "title": "Sensitive fields",
          "text": "Avoid logging passwords, access tokens, database URLs, or unnecessary personal data. Failed authentication is evidence to investigate, not proof of compromise by itself."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m7",
        "cd ~/neptuneguard-security-m7",
        "printf '12:00 fictional-user authentication failed\\n12:01 fictional-user authentication succeeded\\n' > auth-example.log",
        "grep -nF 'failed' auth-example.log",
        "cat auth-example.log",
        "chmod 600 auth-example.log"
      ],
      "lab": {
        "title": "Security Logging and Evidence Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m7",
          "cd ~/neptuneguard-security-m7",
          "printf '12:00 fictional-user authentication failed\\n12:01 fictional-user authentication succeeded\\n' > auth-example.log",
          "grep -nF 'failed' auth-example.log",
          "cat auth-example.log",
          "chmod 600 auth-example.log"
        ],
        "checks": [
          "Identify the failure and subsequent event.",
          "Explain why these events alone do not prove compromise.",
          "List sensitive fields that must not be logged."
        ]
      },
      "hint": "An access token. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "Which field should not be recorded as plaintext in an application log?",
        "answers": [
          {
            "id": "a",
            "label": "A. An access token",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. An event category",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. A sanitized outcome",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. A suitable event timestamp",
            "correct": false
          }
        ],
        "correctExplanation": "An access token. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. An access token. Apply the lesson within the stated defensive practice scope."
      }
    },
    {
      "courseKey": "linux-security-engineering",
      "number": 8,
      "title": "Security Engineering Capstone",
      "badgeKey": "linux-security-8",
      "badgeName": "Linux Security: Security Engineering Capstone",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 7,
      "overview": "Build a fictional risk-and-control report and verify a practice-file integrity baseline.",
      "learningObjectives": [
        "Build a fictional risk-and-control report and verify a practice-file integrity baseline.",
        "Describe the control and its limitations.",
        "Record evidence without exposing sensitive data."
      ],
      "keyIdeas": [
        {
          "title": "Risk-driven controls",
          "text": "Connect each control to an asset and risk, document evidence, and record residual limitations."
        },
        {
          "title": "Practice boundary",
          "text": "This course offers foundational defensive exercises. Self-reported labs and single-question quizzes are not an independent certification or a complete host-hardening assessment."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-security-m8",
        "cd ~/neptuneguard-security-m8",
        "printf 'Asset: fictional report\\nRisk: unauthorized changes\\nControls: restricted modes, protected checksum baseline\\nResidual limitation: privileged access\\n' > security-report.txt",
        "chmod 600 security-report.txt",
        "sha256sum security-report.txt > report.sha256",
        "chmod 600 report.sha256",
        "sha256sum --check report.sha256",
        "cat security-report.txt"
      ],
      "lab": {
        "title": "Security Engineering Capstone Practice Lab",
        "safetyNotice": "Your own Linux VM only. Use fictional data in the named practice directory; writes may replace existing practice files. No sudo, real SSH changes, firewall modifications, external scanning, or real secret values. Report missing tools rather than modifying the host.",
        "commands": [
          "mkdir -p ~/neptuneguard-security-m8",
          "cd ~/neptuneguard-security-m8",
          "printf 'Asset: fictional report\\nRisk: unauthorized changes\\nControls: restricted modes, protected checksum baseline\\nResidual limitation: privileged access\\n' > security-report.txt",
          "chmod 600 security-report.txt",
          "sha256sum security-report.txt > report.sha256",
          "chmod 600 report.sha256",
          "sha256sum --check report.sha256",
          "cat security-report.txt"
        ],
        "checks": [
          "Relate the integrity control to its risk.",
          "Confirm the checksum succeeds before any changes.",
          "Explain the baseline trust and privileged-access limitations.",
          "Prepare a rollback and evidence-handling plan for real changes."
        ]
      },
      "hint": "The fictional baseline matches now. Apply the lesson within the stated defensive practice scope.",
      "quiz": {
        "question": "Which conclusion is justified by this practice lab?",
        "answers": [
          {
            "id": "a",
            "label": "A. The fictional baseline matches now",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. The entire host is secure",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. All threats are eliminated",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. The learner is independently certified",
            "correct": false
          }
        ],
        "correctExplanation": "The fictional baseline matches now. Apply the lesson within the stated defensive practice scope.",
        "incorrectExplanation": "That conclusion or action is not supported. The fictional baseline matches now. Apply the lesson within the stated defensive practice scope."
      }
    }
  ]
};
