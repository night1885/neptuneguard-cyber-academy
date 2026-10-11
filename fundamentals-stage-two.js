export const FUNDAMENTALS_STAGE_TWO = [
  {
    "courseKey": "linux-fundamentals",
    "number": 5,
    "title": "Processes and Jobs",
    "badgeKey": "processes-jobs",
    "badgeName": "Processes and Jobs",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 4,
    "overview": "Observe a short-lived process you started and wait for it to finish.",
    "learningObjectives": [
      "Distinguish process IDs from shell job numbers.",
      "Start a harmless background job.",
      "Wait for a child process to finish."
    ],
    "keyIdeas": [
      {
        "title": "Processes",
        "text": "A process is a running program. A PID identifies a process; shell job numbers are local to the shell."
      },
      {
        "title": "Background jobs",
        "text": "A trailing & starts a command asynchronously. In an interactive Bash shell, jobs -l lists jobs and their process IDs."
      },
      {
        "title": "Waiting",
        "text": "The Bash variable $! holds the PID of the most recent asynchronous job. wait waits for a child process; a completed job may no longer appear in jobs."
      }
    ],
    "lessonCommands": [
      "sleep 15 &",
      "practice_pid=$!",
      "jobs -l",
      "ps -p \"$practice_pid\" -o pid,comm",
      "wait \"$practice_pid\"",
      "jobs -l"
    ],
    "lab": {
      "title": "Processes and Jobs Practice Lab",
      "safetyNotice": "Run this lab in an interactive Bash terminal. Inspect only the process you created; do not signal system processes.",
      "commands": [
        "sleep 15 &",
        "practice_pid=$!",
        "jobs -l",
        "ps -p \"$practice_pid\" -o pid,comm",
        "wait \"$practice_pid\"",
        "jobs -l"
      ],
      "checks": [
        "The sleep job runs briefly in the background.",
        "jobs may show it until it finishes.",
        "wait returns after the child completes."
      ]
    },
    "hint": "wait waits for the specified child process.",
    "quiz": {
      "question": "Which Bash command waits for the child PID stored in practice_pid?",
      "answers": [
        {
          "id": "a",
          "label": "A. wait \"$practice_pid\"",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. chmod 600 practice_pid",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. cd \"$practice_pid\"",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. wc -l practice_pid",
          "correct": false
        }
      ],
      "correctExplanation": "wait waits for the specified child process.",
      "incorrectExplanation": "chmod changes permissions, cd changes directories, and wc counts text."
    }
  },
  {
    "courseKey": "linux-fundamentals",
    "number": 6,
    "title": "Environment Variables and Shell Configuration",
    "badgeKey": "environment-shell",
    "badgeName": "Environment Variables and Shell Configuration",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 5,
    "overview": "Compare shell variables with exported environment variables without editing startup files.",
    "learningObjectives": [
      "Assign and quote a shell variable.",
      "Export a variable for a child process.",
      "Remove a practice variable."
    ],
    "keyIdeas": [
      {
        "title": "Assignment",
        "text": "Bash assignments have no spaces around =. Quote expansions to avoid unintended word splitting and filename expansion."
      },
      {
        "title": "Export",
        "text": "A normal shell variable is not automatically in a child process environment. export marks it for inheritance; a child cannot change its parent environment."
      },
      {
        "title": "Configuration safety",
        "text": "Startup files affect future sessions. This lab does not modify .bashrc, .profile, or PATH. Never print real credential variables."
      }
    ],
    "lessonCommands": [
      "NG_PRACTICE_TOPIC=\"Linux learning\"",
      "printf \"%s\\n\" \"$NG_PRACTICE_TOPIC\"",
      "bash -c 'printf \"before export: %s\\n\" \"${NG_PRACTICE_TOPIC-unset}\"'",
      "export NG_PRACTICE_TOPIC",
      "bash -c 'printf \"after export: %s\\n\" \"$NG_PRACTICE_TOPIC\"'",
      "unset NG_PRACTICE_TOPIC"
    ],
    "lab": {
      "title": "Environment Variables and Shell Configuration Practice Lab",
      "safetyNotice": "Use Bash. NG_PRACTICE_TOPIC is a fictional practice variable; if it is already used in your shell, use a fresh terminal. Do not print tokens or dump the entire environment.",
      "commands": [
        "NG_PRACTICE_TOPIC=\"Linux learning\"",
        "printf \"%s\\n\" \"$NG_PRACTICE_TOPIC\"",
        "bash -c 'printf \"before export: %s\\n\" \"${NG_PRACTICE_TOPIC-unset}\"'",
        "export NG_PRACTICE_TOPIC",
        "bash -c 'printf \"after export: %s\\n\" \"$NG_PRACTICE_TOPIC\"'",
        "unset NG_PRACTICE_TOPIC"
      ],
      "checks": [
        "The current shell prints Linux learning.",
        "The first child reports unset.",
        "The child after export prints Linux learning.",
        "unset removes the practice variable from the current shell."
      ]
    },
    "hint": "export marks the variable for inheritance by child processes.",
    "quiz": {
      "question": "Which command makes a shell variable available to subsequently launched child processes?",
      "answers": [
        {
          "id": "a",
          "label": "A. export NG_PRACTICE_TOPIC",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. cd NG_PRACTICE_TOPIC",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. chmod NG_PRACTICE_TOPIC",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. wc NG_PRACTICE_TOPIC",
          "correct": false
        }
      ],
      "correctExplanation": "export marks the variable for inheritance by child processes.",
      "incorrectExplanation": "Displaying or naming a variable does not export it."
    }
  },
  {
    "courseKey": "linux-fundamentals",
    "number": 7,
    "title": "Pipes, Redirection, and Command Composition",
    "badgeKey": "pipes-redirection",
    "badgeName": "Pipes, Redirection, and Command Composition",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 6,
    "overview": "Combine text tools and distinguish replacing a file from appending to it.",
    "learningObjectives": [
      "Connect standard output to another command.",
      "Distinguish > from >>.",
      "Count adjacent duplicate lines after sorting."
    ],
    "keyIdeas": [
      {
        "title": "Pipes",
        "text": "A pipe connects the standard output of one command to the standard input of another. Standard error is separate unless redirected."
      },
      {
        "title": "Redirection",
        "text": "> opens a file for writing and normally replaces its contents. >> appends. Use these only on the dedicated practice files."
      },
      {
        "title": "Sorting and counting",
        "text": "uniq groups adjacent equal lines. Sorting first places equal lines together. The default pipeline status is the last command status; Bash pipefail changes this behavior."
      }
    ],
    "lessonCommands": [
      "mkdir -p ~/neptuneguard-pipes-lab",
      "cd ~/neptuneguard-pipes-lab",
      "printf 'blue\\nred\\nblue\\n' > colors.txt",
      "sort colors.txt | uniq -c",
      "printf 'green\\n' >> colors.txt",
      "wc -l colors.txt",
      "sort colors.txt | uniq > unique-colors.txt",
      "cat unique-colors.txt"
    ],
    "lab": {
      "title": "Pipes, Redirection, and Command Composition Practice Lab",
      "safetyNotice": "Only use this named practice directory. The first write replaces colors.txt and the final redirect replaces unique-colors.txt if they already exist.",
      "commands": [
        "mkdir -p ~/neptuneguard-pipes-lab",
        "cd ~/neptuneguard-pipes-lab",
        "printf 'blue\\nred\\nblue\\n' > colors.txt",
        "sort colors.txt | uniq -c",
        "printf 'green\\n' >> colors.txt",
        "wc -l colors.txt",
        "sort colors.txt | uniq > unique-colors.txt",
        "cat unique-colors.txt"
      ],
      "checks": [
        "The first pipeline counts blue twice and red once.",
        "Appending green results in four newline characters.",
        "unique-colors.txt has blue, green, and red in sorted order."
      ]
    },
    "hint": ">> appends; > normally replaces existing contents.",
    "quiz": {
      "question": "Which operator appends command output to a file?",
      "answers": [
        {
          "id": "a",
          "label": "A. >>",
          "correct": true
        },
        {
          "id": "b",
          "label": "B. >",
          "correct": false
        },
        {
          "id": "c",
          "label": "C. |",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. &",
          "correct": false
        }
      ],
      "correctExplanation": ">> appends; > normally replaces existing contents.",
      "incorrectExplanation": "A pipe connects commands, while & starts asynchronous execution."
    }
  }
];
