import { handleConsoleCourses as renderCourseView } from './certification-console-course-view.js';
import * as formalPreview from './certification-formal-admin-preview.mjs';
export { courseContentText } from './certification-console-course-view.js';

export function handleConsoleCourses(interaction, config, guildId) {
  return renderCourseView(interaction, config, guildId, formalPreview);
}
