export const ADMINISTRATION_COURSE = {
  "key": "linux-administration",
  "title": "Linux Administration",
  "modules": [
    {
      "courseKey": "linux-administration",
      "number": 1,
      "title": "System Inventory",
      "badgeKey": "linux-admin-1",
      "badgeName": "Linux Administration: System Inventory",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": null,
      "overview": "Record distribution, kernel, and resource information before planning changes.",
      "learningObjectives": [
        "Record distribution, kernel, and resource information before planning changes.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Baseline",
          "text": "A baseline records the current system state. Distribution, kernel, and resource details guide tool selection."
        },
        {
          "title": "Privacy",
          "text": "Inventory output can reveal host details. Keep real reports private and redact identifiers before sharing."
        }
      ],
      "lessonCommands": [
        "cat /etc/os-release",
        "uname -r",
        "getconf _NPROCESSORS_ONLN",
        "df -h ."
      ],
      "lab": {
        "title": "System Inventory Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "cat /etc/os-release",
          "uname -r",
          "getconf _NPROCESSORS_ONLN",
          "df -h ."
        ],
        "checks": [
          "Record distribution ID and kernel version.",
          "Record available space for the current filesystem."
        ]
      },
      "hint": "/etc/os-release. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "Which file identifies the Linux distribution?",
        "answers": [
          {
            "id": "a",
            "label": "A. /etc/os-release",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. /etc/shadow",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. /dev/null",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. notes.txt",
            "correct": false
          }
        ],
        "correctExplanation": "/etc/os-release. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. /etc/os-release. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 2,
      "title": "Users and Groups",
      "badgeKey": "linux-admin-2",
      "badgeName": "Linux Administration: Users and Groups",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 1,
      "overview": "Inspect your own identity and group membership without changing system accounts.",
      "learningObjectives": [
        "Inspect your own identity and group membership without changing system accounts.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Identity",
          "text": "id reports the current user and group IDs. Groups participate in access decisions."
        },
        {
          "title": "Account management",
          "text": "Creating accounts or changing group membership requires a deliberate administrative change plan; this lab is inspection only."
        }
      ],
      "lessonCommands": [
        "id",
        "id -un",
        "id -gn",
        "groups"
      ],
      "lab": {
        "title": "Users and Groups Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "id",
          "id -un",
          "id -gn",
          "groups"
        ],
        "checks": [
          "Distinguish user ID from group IDs.",
          "Explain why adding a user to a privileged group is a security decision."
        ]
      },
      "hint": "id. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "Which command reports your user and group IDs?",
        "answers": [
          {
            "id": "a",
            "label": "A. id",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. rm",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. tar -xf",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. chmod",
            "correct": false
          }
        ],
        "correctExplanation": "id. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. id. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 3,
      "title": "Services with systemd",
      "badgeKey": "linux-admin-3",
      "badgeName": "Linux Administration: Services with systemd",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 2,
      "overview": "Inspect loaded services and distinguish running state from startup enablement.",
      "learningObjectives": [
        "Inspect loaded services and distinguish running state from startup enablement.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Runtime versus boot",
          "text": "Active state describes runtime. Enabled state describes activation links, often for startup; enabled does not imply currently running."
        },
        {
          "title": "Environment prerequisite",
          "text": "systemctl requires a usable systemd manager. Some containers and WSL environments do not provide one; report this prerequisite instead of changing the host."
        }
      ],
      "lessonCommands": [
        "command -v systemctl",
        "systemctl list-units --type=service --all --no-pager",
        "systemctl list-unit-files --type=service --no-pager"
      ],
      "lab": {
        "title": "Services with systemd Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "command -v systemctl",
          "systemctl list-units --type=service --all --no-pager",
          "systemctl list-unit-files --type=service --no-pager"
        ],
        "checks": [
          "Identify one loaded unit if available.",
          "Compare unit state with unit-file enablement.",
          "If systemd is unavailable, explain the environment limitation."
        ]
      },
      "hint": "No; enablement and runtime differ. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "Does an enabled service necessarily mean it is running now?",
        "answers": [
          {
            "id": "a",
            "label": "A. No; enablement and runtime differ",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Yes; always",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Only if chmod is used",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Enabled means deleted",
            "correct": false
          }
        ],
        "correctExplanation": "No; enablement and runtime differ. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. No; enablement and runtime differ. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 4,
      "title": "Storage and Capacity",
      "badgeKey": "linux-admin-4",
      "badgeName": "Linux Administration: Storage and Capacity",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 3,
      "overview": "Compare filesystem capacity with a practice directory size without formatting or mounting disks.",
      "learningObjectives": [
        "Compare filesystem capacity with a practice directory size without formatting or mounting disks.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Filesystem usage",
          "text": "df reports filesystem space. du reports usage attributed to files/directories; their totals answer different questions."
        },
        {
          "title": "Safety",
          "text": "Formatting, partitioning, and mounting can affect data availability. This lab uses only your practice directory and read-only capacity inspection."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-admin-storage",
        "cd ~/neptuneguard-admin-storage",
        "printf 'Small practice file\\n' > sample.txt",
        "df -h .",
        "du -sh .",
        "ls -lh sample.txt"
      ],
      "lab": {
        "title": "Storage and Capacity Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "mkdir -p ~/neptuneguard-admin-storage",
          "cd ~/neptuneguard-admin-storage",
          "printf 'Small practice file\\n' > sample.txt",
          "df -h .",
          "du -sh .",
          "ls -lh sample.txt"
        ],
        "checks": [
          "Compare filesystem capacity with directory usage.",
          "Explain why allocated disk usage and logical file size can differ."
        ]
      },
      "hint": "du -sh .. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "Which command summarizes disk usage for the current directory?",
        "answers": [
          {
            "id": "a",
            "label": "A. du -sh .",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. chmod 777 /",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. rm -rf /",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. systemctl reboot",
            "correct": false
          }
        ],
        "correctExplanation": "du -sh .. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. du -sh .. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 5,
      "title": "Backups and Restore Testing",
      "badgeKey": "linux-admin-5",
      "badgeName": "Linux Administration: Backups and Restore Testing",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 4,
      "overview": "Archive a fictional file and verify restoration in a separate directory.",
      "learningObjectives": [
        "Archive a fictional file and verify restoration in a separate directory.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Restore verification",
          "text": "A backup is useful only if restoration is possible. Test restoration separately from the original data."
        },
        {
          "title": "Archive boundary",
          "text": "List archive members before extraction. This exercise extracts only an archive you just created from fictional files; do not extract untrusted archives."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-admin-backup/source ~/neptuneguard-admin-backup/restore",
        "cd ~/neptuneguard-admin-backup",
        "printf 'Fictional backup data\\n' > source/notes.txt",
        "tar -cf practice.tar -C source notes.txt",
        "tar -tf practice.tar",
        "tar -xf practice.tar -C restore",
        "cmp source/notes.txt restore/notes.txt"
      ],
      "lab": {
        "title": "Backups and Restore Testing Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "mkdir -p ~/neptuneguard-admin-backup/source ~/neptuneguard-admin-backup/restore",
          "cd ~/neptuneguard-admin-backup",
          "printf 'Fictional backup data\\n' > source/notes.txt",
          "tar -cf practice.tar -C source notes.txt",
          "tar -tf practice.tar",
          "tar -xf practice.tar -C restore",
          "cmp source/notes.txt restore/notes.txt"
        ],
        "checks": [
          "Archive listing contains only notes.txt.",
          "cmp returns success with no output when files match.",
          "Explain how off-host copies and retention would matter for real backups."
        ]
      },
      "hint": "Restore separately and compare files. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "What best verifies a backup in this lab?",
        "answers": [
          {
            "id": "a",
            "label": "A. Restore separately and compare files",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Assume archive creation is enough",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Delete the source immediately",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Change all permissions to 777",
            "correct": false
          }
        ],
        "correctExplanation": "Restore separately and compare files. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. Restore separately and compare files. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 6,
      "title": "Scheduling and Automation Planning",
      "badgeKey": "linux-admin-6",
      "badgeName": "Linux Administration: Scheduling and Automation Planning",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 5,
      "overview": "Read a fictional schedule and design a job without installing it.",
      "learningObjectives": [
        "Read a fictional schedule and design a job without installing it.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Cron fields",
          "text": "A traditional user crontab schedule has minute, hour, day-of-month, month, and day-of-week fields before the command. Some formats also include a username."
        },
        {
          "title": "Execution context",
          "text": "Scheduled jobs may have different environment and working directory settings. Use deliberate paths and logs, and test commands manually before scheduling."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-admin-schedule",
        "cd ~/neptuneguard-admin-schedule",
        "printf '# Fictional example only; do not install\\n0 2 * * * /path/to/reviewed-backup-script\\n' > schedule-example.txt",
        "cat schedule-example.txt"
      ],
      "lab": {
        "title": "Scheduling and Automation Planning Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "mkdir -p ~/neptuneguard-admin-schedule",
          "cd ~/neptuneguard-admin-schedule",
          "printf '# Fictional example only; do not install\\n0 2 * * * /path/to/reviewed-backup-script\\n' > schedule-example.txt",
          "cat schedule-example.txt"
        ],
        "checks": [
          "Explain that the sample is scheduled at 02:00 daily in its scheduler timezone.",
          "Identify the placeholder path and why it must not be installed.",
          "Write a plan for logging, failure handling, and review."
        ]
      },
      "hint": "Review, test, and plan failure handling. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "What should happen before installing a scheduled production job?",
        "answers": [
          {
            "id": "a",
            "label": "A. Review, test, and plan failure handling",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Install an unreviewed example",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Disable logging",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Assume the interactive environment",
            "correct": false
          }
        ],
        "correctExplanation": "Review, test, and plan failure handling. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. Review, test, and plan failure handling. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 7,
      "title": "Configuration Change Management",
      "badgeKey": "linux-admin-7",
      "badgeName": "Linux Administration: Configuration Change Management",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 6,
      "overview": "Practice backing up and comparing a fictional configuration before a change.",
      "learningObjectives": [
        "Practice backing up and comparing a fictional configuration before a change.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Change discipline",
          "text": "Record the goal, current state, expected effect, validation, and rollback plan before editing real configuration."
        },
        {
          "title": "Diff",
          "text": "diff shows differences; exit status 1 indicates differences, not necessarily an error. Syntax validation depends on the actual service and file format."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-admin-config",
        "cd ~/neptuneguard-admin-config",
        "printf 'mode=practice\\n' > app.conf",
        "cp app.conf app.conf.before",
        "printf 'mode=reviewed\\n' > app.conf",
        "diff -u app.conf.before app.conf",
        "cp app.conf.before app.conf",
        "cmp app.conf.before app.conf"
      ],
      "lab": {
        "title": "Configuration Change Management Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "mkdir -p ~/neptuneguard-admin-config",
          "cd ~/neptuneguard-admin-config",
          "printf 'mode=practice\\n' > app.conf",
          "cp app.conf app.conf.before",
          "printf 'mode=reviewed\\n' > app.conf",
          "diff -u app.conf.before app.conf",
          "cp app.conf.before app.conf",
          "cmp app.conf.before app.conf"
        ],
        "checks": [
          "Review the one-line change.",
          "Restore only the fictional file from its backup.",
          "Explain that copying a file alone does not validate a real service configuration."
        ]
      },
      "hint": "Backup, review diff, validate, rollback plan. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "Which practice supports a reversible configuration change?",
        "answers": [
          {
            "id": "a",
            "label": "A. Backup, review diff, validate, rollback plan",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Edit without a record",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Delete the backup first",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. Restart unrelated services",
            "correct": false
          }
        ],
        "correctExplanation": "Backup, review diff, validate, rollback plan. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. Backup, review diff, validate, rollback plan. Review the lesson and apply this principle within the stated lab scope."
      }
    },
    {
      "courseKey": "linux-administration",
      "number": 8,
      "title": "Administration Capstone",
      "badgeKey": "linux-admin-8",
      "badgeName": "Linux Administration: Administration Capstone",
      "lessonXp": 25,
      "labXp": 25,
      "quizXp": 50,
      "prerequisiteModuleNumber": 7,
      "overview": "Create a fictional change plan and verify a small backup/restore workflow.",
      "learningObjectives": [
        "Create a fictional change plan and verify a small backup/restore workflow.",
        "Document observations and environment limitations.",
        "Distinguish practice activity from privileged production changes."
      ],
      "keyIdeas": [
        {
          "title": "Plan and evidence",
          "text": "Combine inventory, risk review, restoration testing, and acceptance criteria into a change record."
        },
        {
          "title": "Scope",
          "text": "This is a foundational administrative practice exercise. It does not independently assess production administration skill or authorize changes on other systems."
        }
      ],
      "lessonCommands": [
        "mkdir -p ~/neptuneguard-admin-capstone/source ~/neptuneguard-admin-capstone/restore",
        "cd ~/neptuneguard-admin-capstone",
        "printf 'Fictional settings\\n' > source/settings.txt",
        "tar -cf settings.tar -C source settings.txt",
        "tar -tf settings.tar",
        "tar -xf settings.tar -C restore",
        "cmp source/settings.txt restore/settings.txt"
      ],
      "lab": {
        "title": "Administration Capstone Practice Lab",
        "safetyNotice": "Use your own Linux VM. No sudo, account changes, service restarts, disk operations, or schedule installation. Writes are limited to fictional files in the named lab directory and may replace existing practice files. Missing tools or service managers should be reported rather than installed blindly.",
        "commands": [
          "mkdir -p ~/neptuneguard-admin-capstone/source ~/neptuneguard-admin-capstone/restore",
          "cd ~/neptuneguard-admin-capstone",
          "printf 'Fictional settings\\n' > source/settings.txt",
          "tar -cf settings.tar -C source settings.txt",
          "tar -tf settings.tar",
          "tar -xf settings.tar -C restore",
          "cmp source/settings.txt restore/settings.txt"
        ],
        "checks": [
          "Document the intended change, risk, validation, and rollback.",
          "Verify the fictional restore matches its source.",
          "Record an approval boundary before any real host change."
        ]
      },
      "hint": "Reviewed plan, tests, approval, rollback. Review the lesson and apply this principle within the stated lab scope.",
      "quiz": {
        "question": "What makes a change ready for a controlled implementation?",
        "answers": [
          {
            "id": "a",
            "label": "A. Reviewed plan, tests, approval, rollback",
            "correct": true
          },
          {
            "id": "b",
            "label": "B. Only a successful syntax check",
            "correct": false
          },
          {
            "id": "c",
            "label": "C. Unreviewed privileged commands",
            "correct": false
          },
          {
            "id": "d",
            "label": "D. No acceptance criteria",
            "correct": false
          }
        ],
        "correctExplanation": "Reviewed plan, tests, approval, rollback. Review the lesson and apply this principle within the stated lab scope.",
        "incorrectExplanation": "That choice does not meet the stated objective. Reviewed plan, tests, approval, rollback. Review the lesson and apply this principle within the stated lab scope."
      }
    }
  ]
};
