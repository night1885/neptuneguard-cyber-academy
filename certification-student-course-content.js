import { COURSES, getCourse } from './course-registry.js';

// Teaching-only bridge copied from legacy Module 1 instructions; never import the executable entry point.
const moduleOne = {
  overview: 'Learn how to work safely in a Linux terminal and shell.',
  learningObjectives: ['Understand the difference between a terminal and a shell.', 'Find your current directory with pwd.', 'List files with ls.', 'Move between directories with cd.', 'Create a directory with mkdir.'],
  keyIdeas: [{ title: 'Terminal and shell', text: 'The terminal is the text-based window you interact with. The shell is the program inside it that reads and runs commands. Bash is a common Linux shell.' }],
  lessonCommands: ['pwd', 'ls -la', 'cd ~', 'mkdir -p ~/neptuneguard-lab'],
  lab: { title: 'Terminal and Shell Basics Practice Lab', safetyNotice: 'Use a Linux VM, WSL, or another Linux system you own or control. This lab only creates an empty directory and an empty file in your home folder.',
    commands: ['pwd', 'mkdir -p ~/neptuneguard-lab', 'cd ~/neptuneguard-lab', 'touch notes.txt', 'ls -la'],
    checks: ['pwd prints the directory you are currently in.', 'mkdir -p creates the practice directory if it does not exist.', 'cd changes into that directory.', 'touch notes.txt creates an empty file.', 'ls -la lists files, including hidden entries and details.'] },
  hint: 'pwd means print working directory.',
  quiz: { question: 'Which command prints your current working directory?', answers: [
    { id: 'a', label: 'A. ls', correct: false }, { id: 'b', label: 'B. pwd', correct: true },
    { id: 'c', label: 'C. cd', correct: false }, { id: 'd', label: 'D. mkdir', correct: false }
  ], correctExplanation: 'pwd means print working directory.', incorrectExplanation: 'ls lists files, cd changes directories, and mkdir creates directories. The command that prints your working directory is pwd.' }
};

export function getStudentCourseModule(courseKey, index) {
  const course = getCourse(courseKey), module = course?.modules[index];
  if (!module) return null;
  return courseKey === 'linux-fundamentals' && module.number === 1 ? { ...moduleOne, ...module } : module;
}
export function validPracticeQuiz(quiz) {
  return Boolean(quiz && typeof quiz.question === 'string' && quiz.question.trim() && Array.isArray(quiz.answers) &&
    quiz.answers.length >= 2 && quiz.answers.length <= 5 && quiz.answers.every(answer =>
      typeof answer.id === 'string' && /^[a-z0-9-]{1,16}$/.test(answer.id) && typeof answer.label === 'string' && answer.label.trim() && typeof answer.correct === 'boolean') &&
    new Set(quiz.answers.map(answer => answer.id)).size === quiz.answers.length && quiz.answers.filter(answer => answer.correct).length === 1);
}
export function studentCourseContentGaps() {
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const texts = value => Array.isArray(value) && value.length > 0 && value.every(text);
  const gaps = [];
  for (const course of COURSES) for (let index = 0; index < course.modules.length; index++) {
    const module = getStudentCourseModule(course.key, index);
    const checks = { overview: text(module.overview), learningObjectives: texts(module.learningObjectives),
      keyIdeas: Array.isArray(module.keyIdeas) && module.keyIdeas.length > 0 && module.keyIdeas.every(idea => text(idea.title) && text(idea.text)),
      lessonCommands: texts(module.lessonCommands), labSafety: text(module.lab?.safetyNotice), labCommands: texts(module.lab?.commands), labChecks: texts(module.lab?.checks),
      hint: text(module.hint), quiz: validPracticeQuiz(module.quiz), quizExplanations: text(module.quiz?.correctExplanation) && text(module.quiz?.incorrectExplanation) };
    const missing = Object.keys(checks).filter(field => !checks[field]);
    if (missing.length) gaps.push({ courseKey: course.key, moduleNumber: module.number, missing });
  }
  return gaps;
}
