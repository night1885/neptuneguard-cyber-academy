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
  prerequisiteModuleNumber: 1
};

export const LINUX_FUNDAMENTALS_MODULES = [
  MODULE_ONE,
  MODULE_TWO
];