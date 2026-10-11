export const FUNDAMENTALS_STAGE_THREE = [
  {
    "courseKey": "linux-fundamentals",
    "number": 8,
    "title": "Linux Networking Basics",
    "badgeKey": "linux-networking",
    "badgeName": "Linux Networking Basics",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 7,
    "overview": "Inspect local interfaces, routes, and listening TCP sockets without changing network configuration.",
    "learningObjectives": [
      "Distinguish addresses, routes, and sockets.",
      "Inspect only local network state.",
      "Recognize loopback interfaces."
    ],
    "keyIdeas": [
      {
        "title": "Addresses and routes",
        "text": "Interface addresses identify local network endpoints. A route table selects where traffic goes; a default route is used when no more specific route matches."
      },
      {
        "title": "Listening sockets",
        "text": "ss -ltn displays listening TCP sockets with numeric addresses and ports. Listening does not prove a service is reachable from another host."
      },
      {
        "title": "Scope",
        "text": "These commands inspect your own system. Do not scan third-party networks or change interfaces, routes, or firewall rules in this lab."
      }
    ],
    "lessonCommands": [
      "command -v ip",
      "command -v ss",
      "ip -brief address show",
      "ip route show",
      "ss -ltn"
    ],
    "lab": {
      "title": "Linux Networking Basics Practice Lab",
      "safetyNotice": "Use your own Linux VM or WSL instance. If ip or ss is missing, record that prerequisite and pause; do not install packages blindly.",
      "commands": [
        "command -v ip",
        "command -v ss",
        "ip -brief address show",
        "ip route show",
        "ss -ltn"
      ],
      "checks": [
        "Identify the loopback interface if present.",
        "Record whether a default route appears; environments differ.",
        "Describe one listening TCP socket, or report none."
      ]
    },
    "hint": "ss -ltn selects listening TCP sockets and numeric output.",
    "quiz": {
      "question": "Which command lists local listening TCP sockets with numeric addresses?",
      "answers": [
        {
          "id": "a",
          "label": "A. ss -ltn",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. chmod 600 notes.txt",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. wc -l notes.txt",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. ip route add default",
          "correct": false
        }
      ],
      "correctExplanation": "ss -ltn selects listening TCP sockets and numeric output.",
      "incorrectExplanation": "Routes and file commands do not list listening TCP sockets."
    }
  },
  {
    "courseKey": "linux-fundamentals",
    "number": 9,
    "title": "Package Management Basics",
    "badgeKey": "package-management",
    "badgeName": "Package Management Basics",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 8,
    "overview": "Identify the distribution and inspect package metadata without installing or removing software.",
    "learningObjectives": [
      "Identify the distribution family.",
      "Distinguish package queries from installation.",
      "Inspect Bash package information."
    ],
    "keyIdeas": [
      {
        "title": "Distribution families",
        "text": "Debian-family systems commonly use APT and dpkg; Fedora-family systems use DNF and RPM. Use the tools present on your system."
      },
      {
        "title": "Query before changing",
        "text": "Package queries help inspect versions and repositories. Installing, upgrading, or removing software changes the system and is outside this lab."
      },
      {
        "title": "Repository trust",
        "text": "Use approved repositories and verify package sources. Do not pipe an unreviewed downloaded script into a shell."
      }
    ],
    "lessonCommands": [
      "cat /etc/os-release",
      "command -v apt-cache",
      "command -v dnf",
      "if command -v apt-cache >/dev/null 2>&1; then apt-cache policy bash; elif command -v dnf >/dev/null 2>&1; then dnf --cacheonly info bash; else printf \"No supported package query tool found\\n\"; fi"
    ],
    "lab": {
      "title": "Package Management Basics Practice Lab",
      "safetyNotice": "No sudo, installation, removal, or repository changes. DNF cache-only queries may fail when metadata has not been cached; report that instead of changing the system.",
      "commands": [
        "cat /etc/os-release",
        "command -v apt-cache",
        "command -v dnf",
        "if command -v apt-cache >/dev/null 2>&1; then apt-cache policy bash; elif command -v dnf >/dev/null 2>&1; then dnf --cacheonly info bash; else printf \"No supported package query tool found\\n\"; fi"
      ],
      "checks": [
        "Record the distribution ID from os-release.",
        "Record which query tool exists.",
        "Describe Bash package information, or explain missing cache/tool prerequisites."
      ]
    },
    "hint": "apt-cache policy bash queries version and source information.",
    "quiz": {
      "question": "Which command queries Bash package version/source information on an APT system?",
      "answers": [
        {
          "id": "a",
          "label": "A. apt-cache policy bash",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. sudo apt remove bash",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. rm /bin/bash",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. chmod 777 /bin/bash",
          "correct": false
        }
      ],
      "correctExplanation": "apt-cache policy bash queries version and source information.",
      "incorrectExplanation": "Removal or permission changes are not metadata queries."
    }
  },
  {
    "courseKey": "linux-fundamentals",
    "number": 10,
    "title": "Shell Scripting Basics",
    "badgeKey": "shell-scripting",
    "badgeName": "Shell Scripting Basics",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 9,
    "overview": "Create and syntax-check a small Bash script that accepts a quoted argument.",
    "learningObjectives": [
      "Write a Bash script in a practice directory.",
      "Syntax-check before execution.",
      "Quote positional parameters."
    ],
    "keyIdeas": [
      {
        "title": "Script execution",
        "text": "bash script.sh runs a script with Bash without requiring an executable file mode. A shebang identifies the intended interpreter when directly executed."
      },
      {
        "title": "Arguments",
        "text": "${1:-learner} uses learner when the first positional argument is unset or empty. Quoting preserves spaces in names."
      },
      {
        "title": "Validation",
        "text": "bash -n checks syntax without executing commands. Syntax success is not a guarantee of correct behavior or safety."
      }
    ],
    "lessonCommands": [
      "mkdir -p ~/neptuneguard-script-lab",
      "cd ~/neptuneguard-script-lab",
      "cat > greet.sh <<'EOF'\n#!/usr/bin/env bash\nname=\"${1:-learner}\"\nprintf 'Hello, %s\\n' \"$name\"\nEOF",
      "bash -n greet.sh",
      "bash greet.sh",
      "bash greet.sh \"Linux learner\""
    ],
    "lab": {
      "title": "Shell Scripting Basics Practice Lab",
      "safetyNotice": "Use Bash on your own system. The here-document replaces only greet.sh in the named practice directory. Do not run downloaded scripts.",
      "commands": [
        "mkdir -p ~/neptuneguard-script-lab",
        "cd ~/neptuneguard-script-lab",
        "cat > greet.sh <<'EOF'\n#!/usr/bin/env bash\nname=\"${1:-learner}\"\nprintf 'Hello, %s\\n' \"$name\"\nEOF",
        "bash -n greet.sh",
        "bash greet.sh",
        "bash greet.sh \"Linux learner\""
      ],
      "checks": [
        "Syntax checking produces no error.",
        "Running without an argument prints Hello, learner.",
        "The quoted two-word argument stays together."
      ]
    },
    "hint": "bash -n parses the script without executing its commands.",
    "quiz": {
      "question": "Which command checks Bash syntax without executing the script?",
      "answers": [
        {
          "id": "a",
          "label": "A. bash -n greet.sh",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. bash greet.sh",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. chmod 777 greet.sh",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. cat /etc/shadow",
          "correct": false
        }
      ],
      "correctExplanation": "bash -n parses the script without executing its commands.",
      "incorrectExplanation": "Running the script differs from parsing it; permission changes are not syntax checks."
    }
  },
  {
    "courseKey": "linux-fundamentals",
    "number": 11,
    "title": "Logs and Troubleshooting",
    "badgeKey": "logs-troubleshooting",
    "badgeName": "Logs and Troubleshooting",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 10,
    "overview": "Practice evidence-based troubleshooting using a fictional application log.",
    "learningObjectives": [
      "Read recent log entries.",
      "Locate an error without exposing real secrets.",
      "Separate observations from root-cause conclusions."
    ],
    "keyIdeas": [
      {
        "title": "Evidence",
        "text": "An error message is evidence, not always a complete root cause. Record the time, affected operation, and surrounding entries before proposing a change."
      },
      {
        "title": "Controlled logs",
        "text": "Real logs may contain credentials or personal information. This lab uses fictional data instead of requesting protected system logs."
      },
      {
        "title": "Exit status",
        "text": "A command exit status indicates success or failure according to that command. grep returns 1 when no lines match; this need not mean a broken tool."
      }
    ],
    "lessonCommands": [
      "mkdir -p ~/neptuneguard-log-lab",
      "cd ~/neptuneguard-log-lab",
      "printf '10:00 INFO starting\\n10:01 ERROR database hostname unresolved\\n10:02 INFO retry scheduled\\n' > app.log",
      "tail -n 3 app.log",
      "grep -nF 'ERROR' app.log",
      "printf \"Previous command status: %s\\n\" \"$?\""
    ],
    "lab": {
      "title": "Logs and Troubleshooting Practice Lab",
      "safetyNotice": "The fictional log contains no real credentials. The write command replaces app.log only in this practice directory. Do not publish real logs without redaction.",
      "commands": [
        "mkdir -p ~/neptuneguard-log-lab",
        "cd ~/neptuneguard-log-lab",
        "printf '10:00 INFO starting\\n10:01 ERROR database hostname unresolved\\n10:02 INFO retry scheduled\\n' > app.log",
        "tail -n 3 app.log",
        "grep -nF 'ERROR' app.log",
        "printf \"Previous command status: %s\\n\" \"$?\""
      ],
      "checks": [
        "Find the error on line 2.",
        "Explain that hostname resolution failed, but the fictional log alone does not prove why.",
        "Record the context and a proposed non-destructive hostname check."
      ]
    },
    "hint": "Inspect the hostname and surrounding evidence before making changes.",
    "quiz": {
      "question": "A fictional log reports an unresolved database hostname. What is the safest first response?",
      "answers": [
        {
          "id": "a",
          "label": "A. Inspect configured hostname and context",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. Delete the database",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. Reset every password immediately",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. Disable all access controls",
          "correct": false
        }
      ],
      "correctExplanation": "Inspect the hostname and surrounding evidence before making changes.",
      "incorrectExplanation": "Destructive or unrelated changes do not follow from the available evidence."
    }
  },
  {
    "courseKey": "linux-fundamentals",
    "number": 12,
    "title": "Linux Fundamentals Capstone",
    "badgeKey": "linux-fundamentals-capstone",
    "badgeName": "Linux Fundamentals Capstone",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 11,
    "overview": "Combine safe file operations, text processing, permissions, and scripting in a final practice workspace.",
    "learningObjectives": [
      "Create a reproducible practice workspace.",
      "Generate a sorted text report.",
      "Restrict report permissions and validate a script."
    ],
    "keyIdeas": [
      {
        "title": "Integration",
        "text": "Build a short workflow from familiar commands. Keep source input separate from generated output and check each stage."
      },
      {
        "title": "Safety boundary",
        "text": "Work only in the named practice directory. Never use real secrets, privileged paths, recursive deletion, or sudo."
      },
      {
        "title": "Completion evidence",
        "text": "The bot records self-reported lesson/lab completion and a single-question quiz. This is a practice checkpoint, not an independently verified professional certification."
      }
    ],
    "lessonCommands": [
      "mkdir -p ~/neptuneguard-capstone",
      "cd ~/neptuneguard-capstone",
      "printf 'network\\nfiles\\nnetwork\\npermissions\\n' > topics.txt",
      "sort topics.txt | uniq -c > report.txt",
      "chmod 600 report.txt",
      "cat report.txt",
      "ls -l report.txt",
      "cat > report.sh <<'EOF'\n#!/usr/bin/env bash\nset -o pipefail\nsort topics.txt | uniq -c\nEOF",
      "bash -n report.sh",
      "bash report.sh"
    ],
    "lab": {
      "title": "Linux Fundamentals Capstone Practice Lab",
      "safetyNotice": "Practice directory only. These writes replace topics.txt, report.txt, and report.sh if they exist. Keep fictional input and avoid system configuration changes.",
      "commands": [
        "mkdir -p ~/neptuneguard-capstone",
        "cd ~/neptuneguard-capstone",
        "printf 'network\\nfiles\\nnetwork\\npermissions\\n' > topics.txt",
        "sort topics.txt | uniq -c > report.txt",
        "chmod 600 report.txt",
        "cat report.txt",
        "ls -l report.txt",
        "cat > report.sh <<'EOF'\n#!/usr/bin/env bash\nset -o pipefail\nsort topics.txt | uniq -c\nEOF",
        "bash -n report.sh",
        "bash report.sh"
      ],
      "checks": [
        "The report counts network twice and each other topic once.",
        "report.txt has ordinary permission bits rw-------.",
        "report.sh passes syntax checking and prints the counts.",
        "Explain why repeated completion must not add XP again."
      ]
    },
    "hint": "Sorting groups equal lines; uniq -c counts them; chmod 600 restricts ordinary file permission bits.",
    "quiz": {
      "question": "Which workflow counts repeated lines and restricts the generated report to owner read/write?",
      "answers": [
        {
          "id": "a",
          "label": "A. sort input | uniq -c > report; chmod 600 report",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. chmod 777 /etc",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. rm -rf /",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. Delete the learner database",
          "correct": false
        }
      ],
      "correctExplanation": "Sorting groups equal lines; uniq -c counts them; chmod 600 restricts ordinary file permission bits.",
      "incorrectExplanation": "The other actions are destructive or unrelated to the safe practice goal."
    }
  }
];
