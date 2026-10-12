import { SOC_COURSE } from './soc-analyst.js';
import { SECURITY_COURSE } from './linux-security-engineering.js';
import { ADMINISTRATION_COURSE } from './linux-administration.js';
import { FUNDAMENTALS_STAGE_THREE } from './fundamentals-stage-three.js';
import { FUNDAMENTALS_STAGE_TWO } from './fundamentals-stage-two.js';
import { MODULE_ONE, MODULE_TWO } from './course-content.js';

export const ADDITIONAL_FUNDAMENTALS_MODULES = [
  {
    "number": 3,
    "title": "Reading and Searching Text",
    "badgeKey": "reading-searching-text",
    "badgeName": "Reading and Searching Text",
    "overview": "Inspect text files and locate matching lines without editing the originals.",
    "learningObjectives": [
      "Read the beginning and end of a file.",
      "Count newline characters with wc -l.",
      "Search literal text with grep -F."
    ],
    "keyIdeas": [
      {
        "title": "Inspect before changing",
        "text": "head and tail display the beginning and end of a file. cat prints the complete file; use it for short practice files."
      },
      {
        "title": "Literal search",
        "text": "grep -F treats its pattern as fixed text rather than a regular expression. grep -n includes line numbers."
      },
      {
        "title": "Counting lines",
        "text": "wc -l counts newline characters. A final line without a newline is not counted as another newline."
      }
    ],
    "lessonCommands": [
      "head -n 2 notes.txt",
      "tail -n 2 notes.txt",
      "wc -l notes.txt",
      "grep -nF 'Linux' notes.txt"
    ],
    "lab": {
      "title": "Text Inspection Practice Lab",
      "safetyNotice": "Use only your dedicated practice directory. Repeating the write command replaces its practice file.",
      "commands": [
        "mkdir -p ~/neptuneguard-text-lab",
        "cd ~/neptuneguard-text-lab",
        "printf 'Linux basics\\nFiles and directories\\nLinux permissions\\nPractice complete\\n' > notes.txt",
        "head -n 2 notes.txt",
        "tail -n 2 notes.txt",
        "wc -l notes.txt",
        "grep -nF 'Linux' notes.txt"
      ],
      "checks": [
        "head shows the first two lines.",
        "tail shows the last two lines.",
        "wc -l reports 4 newline characters.",
        "grep reports matches on lines 1 and 3."
      ]
    },
    "hint": "Use grep -F for literal text; add -n to show line numbers.",
    "quiz": {
      "question": "Which command searches notes.txt for the literal text Linux and shows matching line numbers?",
      "answers": [
        {
          "id": "a",
          "label": "A. wc -l notes.txt",
          "correct": false
        },
        {
          "id": "b",
          "label": "B. grep -nF 'Linux' notes.txt",
          "correct": true
        },
        {
          "id": "c",
          "label": "C. head -n 2 notes.txt",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. tail -n 2 notes.txt",
          "correct": false
        }
      ],
      "correctExplanation": "grep -nF searches fixed text and prefixes matching lines with their line numbers.",
      "incorrectExplanation": "wc counts; head and tail display portions of a file. grep searches matching lines."
    },
    "courseKey": "linux-fundamentals",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 2
  },
  {
    "number": 4,
    "title": "Permissions and Ownership",
    "badgeKey": "permissions-ownership",
    "badgeName": "Permissions and Ownership",
    "overview": "Read owner, group, and other permissions and modify only files you created.",
    "learningObjectives": [
      "Identify owner, group, and other permission classes.",
      "Interpret read, write, and execute bits.",
      "Apply restrictive permissions to a practice file."
    ],
    "keyIdeas": [
      {
        "title": "Permission classes",
        "text": "ls -l displays mode bits and the owner and group. u means owner, g means group, and o means others."
      },
      {
        "title": "Numeric modes",
        "text": "Read has value 4, write 2, and execute 1. For a regular file, mode 600 grants owner read/write and no group or other permission bits."
      },
      {
        "title": "Directory execution",
        "text": "On a directory, execute means traversal/search, not running the directory as a program. Permissions are only one layer of access control; do not use this exercise to store real secrets."
      }
    ],
    "lessonCommands": [
      "id",
      "ls -l private.txt",
      "chmod 600 private.txt",
      "ls -l private.txt"
    ],
    "lab": {
      "title": "Permissions Practice Lab",
      "safetyNotice": "No sudo is needed. Modify only the practice file below; never apply recursive permission changes to system directories.",
      "commands": [
        "mkdir -p ~/neptuneguard-permissions-lab",
        "cd ~/neptuneguard-permissions-lab",
        "printf 'Fictional practice data only\\n' > private.txt",
        "id",
        "ls -l private.txt",
        "chmod 600 private.txt",
        "ls -l private.txt",
        "chmod u+x private.txt",
        "ls -l private.txt",
        "chmod u-x private.txt",
        "ls -l private.txt"
      ],
      "checks": [
        "Find your user and groups with id.",
        "After chmod 600, the ordinary permission bits show rw-------.",
        "Adding u+x adds the owner execute bit; it does not turn text into a valid program.",
        "Removing u-x returns the ordinary mode bits to rw-------."
      ]
    },
    "hint": "600 means 6 for owner (4+2), 0 for group, and 0 for others.",
    "quiz": {
      "question": "What does chmod 600 private.txt set for a regular file?",
      "answers": [
        {
          "id": "a",
          "label": "A. Everyone can read and write",
          "correct": false
        },
        {
          "id": "b",
          "label": "B. Owner read/write; group/others none",
          "correct": true
        },
        {
          "id": "c",
          "label": "C. Everyone can execute",
          "correct": false
        },
        {
          "id": "d",
          "label": "D. Changes the file owner",
          "correct": false
        }
      ],
      "correctExplanation": "600 sets owner read/write and clears group and other permission bits.",
      "incorrectExplanation": "chmod changes mode bits, not ownership. Read is 4 and write is 2, so owner read/write is 6."
    },
    "courseKey": "linux-fundamentals",
    "lessonXp": 25,
    "labXp": 25,
    "quizXp": 50,
    "prerequisiteModuleNumber": 3
  }
];

export const COURSES = [{
  key: 'linux-fundamentals', title: 'Linux Fundamentals',
  modules: [MODULE_ONE, MODULE_TWO, ...ADDITIONAL_FUNDAMENTALS_MODULES, ...FUNDAMENTALS_STAGE_TWO, ...FUNDAMENTALS_STAGE_THREE]
}, ADMINISTRATION_COURSE, SECURITY_COURSE, SOC_COURSE];

export function getCourse(key) { return COURSES.find(course => course.key === key); }
export function getModule(key, number) { return getCourse(key)?.modules.find(module => module.number === number); }
