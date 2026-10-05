export const MODULE_ONE = {
  courseKey: 'linux-fundamentals',
  number: 1,
  title: 'Terminal and Shell Basics',
  lessonXp: 25,
  labXp: 25,
  quizXp: 50,
  badgeKey: 'linux-foundations',
  badgeName: 'Linux Foundations',
  prerequisiteModuleNumber: null
};

export const MODULE_TWO = {
  courseKey: 'linux-fundamentals',
  number: 2,
  title: 'Files and Directories',
  lessonXp: 25,
  labXp: 25,
  quizXp: 50,
  badgeKey: 'files-and-directories',
  badgeName: 'Files and Directories',
  prerequisiteModuleNumber: 1,

  overview:
    'Learn how Linux organizes files and directories, navigate safely, inspect files, and manage practice files without affecting important system data.',

  learningObjectives: [
    'Recognize absolute paths and relative paths.',
    'List and navigate directories with ls and cd.',
    'Copy files with cp and move or rename files with mv.',
    'Read files safely with cat, less, head, and tail.',
    'Use find to locate files inside a directory you control.',
    'Use rm cautiously and only on practice files you created.'
  ],

  keyIdeas: [
    {
      title: 'Paths',
      text:
        'An absolute path begins with / and identifies a location from the root directory. A relative path is interpreted from your current working directory.'
    },
    {
      title: 'Copying and moving',
      text:
        'cp creates a copy and leaves the original file in place. mv moves a file or renames it when the destination is in the same directory.'
    },
    {
      title: 'Deletion safety',
      text:
        'rm permanently removes files in typical command-line workflows. Verify the path with pwd and ls before using rm, and practice only inside your dedicated lab directory.'
    }
  ],

  lessonCommands: [
    'pwd',
    'ls -la',
    'cd ~/neptuneguard-files-lab',
    'cp notes.txt notes-copy.txt',
    'mv notes-copy.txt archive.txt',
    'cat notes.txt',
    'less notes.txt',
    'find . -type f'
  ],

  lab: {
    title: 'Files and Directories Practice Lab',
    safetyNotice:
      'Use a Linux VM, WSL, or another Linux system you own or control. Run these commands only inside the dedicated practice directory shown below.',

    commands: [
      'mkdir -p ~/neptuneguard-files-lab/projects',
      'cd ~/neptuneguard-files-lab',
      'printf "NeptuneGuard practice file\\n" > notes.txt',
      'cp notes.txt notes-copy.txt',
      'mv notes-copy.txt projects/archive.txt',
      'ls -la',
      'ls -la projects',
      'cat notes.txt',
      'find . -type f'
    ],

    checks: [
      '`mkdir -p` creates the practice directory and its projects subdirectory.',
      '`printf ... > notes.txt` writes a safe one-line practice file.',
      '`cp` creates notes-copy.txt and keeps notes.txt.',
      '`mv` moves the copy into projects and renames it archive.txt.',
      '`ls -la` lets you inspect directory contents before making changes.',
      '`cat notes.txt` displays the short practice file.',
      '`find . -type f` lists files below the current lab directory.'
    ]
  },

  hint:
    'An absolute path starts with /. A relative path starts from wherever pwd says you are. Before using a command that changes files, use pwd and ls to confirm you are inside ~/neptuneguard-files-lab.',

  quiz: {
    question:
      'Which command creates a copy of notes.txt named notes-copy.txt while keeping the original notes.txt?',
    answers: [
      {
        id: 'a',
        label: 'A. mv notes.txt notes-copy.txt',
        correct: false
      },
      {
        id: 'b',
        label: 'B. cp notes.txt notes-copy.txt',
        correct: true
      },
      {
        id: 'c',
        label: 'C. rm notes.txt notes-copy.txt',
        correct: false
      },
      {
        id: 'd',
        label: 'D. cd notes.txt notes-copy.txt',
        correct: false
      }
    ],
    correctExplanation:
      '`cp notes.txt notes-copy.txt` creates a new copy while leaving the original notes.txt in place.',
    incorrectExplanation:
      '`mv` moves or renames a file, `rm` removes files, and `cd` changes directories. The copy command is `cp`.'
  }
};

export const LINUX_FUNDAMENTALS_MODULES = [
  MODULE_ONE,
  MODULE_TWO
];