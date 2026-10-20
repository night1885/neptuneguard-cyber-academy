import { certificationDashboardEntry } from './certification-dashboard.js';
import { initialConsoleEntry } from './certification-initial-console.js';

// Payload construction only; publication and startup activation are separate steps.
export function buildCertificationEntryPanels() {
  return {
    admin: certificationDashboardEntry(),
    student: {
      content: 'NeptuneGuard — Registration / application\nOpen your own application console or approved student panel. Registration and application submission do not grant course or lab access.',
      components: [initialConsoleEntry()],
      allowedMentions: { parse: [] }
    }
  };
}
