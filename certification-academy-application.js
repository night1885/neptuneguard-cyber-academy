import { Events } from 'discord.js';
import { attachCertificationRuntime } from './certification-runtime.js';
import { createApplicationShutdown } from './certification-application-shutdown.js';
import { withStudentEntry } from './certification-student-entry.js';
import { createAcademyCourseGate } from './certification-academy-course-gate.js';
import { pauseRetainingAcademyInteraction } from './certification-retention-hold.js';

export function createAcademyApplication({ client, pool, guildId, initializeDatabase, handleInteraction, env = process.env,
  signals = process, exit = code => process.exit(code), log = (...args) => console.error(...args),
  timeoutMs = 15000, attachRuntime = attachCertificationRuntime } = {}) {
  if ([initializeDatabase, handleInteraction, attachRuntime].some(fn => typeof fn !== 'function') ||
    ['on', 'once', 'off', 'login', 'destroy'].some(name => typeof client?.[name] !== 'function') ||
    typeof pool?.end !== 'function') throw new Error('Invalid academy application configuration');
  const tasks = new Set(); let stopping = false; let started = false; let failed = false;
  let certification; let certificationClosing;
  const report = (message, error) => { try { log(message, { name: error?.name, code: error?.code }); } catch {} };
  const shutdown = createApplicationShutdown({ signals, timeoutMs, log,
    exit: code => exit(failed ? 1 : code),
    stopAdmission() {
      stopping = true; client.off(Events.InteractionCreate, onInteraction); client.off(Events.ClientReady, onReady);
      certificationClosing = Promise.resolve(certification.detach());
      void certificationClosing.catch(() => {});
    },
    async drainAcademy() { await Promise.allSettled([...tasks]); },
    detachCertification: () => certificationClosing || certification.detach(),
    closeAcademyPool: () => pool.end(), destroyClient: () => client.destroy()
  });
  certification = attachRuntime(client, pool, guildId, env);
  const gateCourse = createAcademyCourseGate({ certification, guildId, verifiedRoleId: env.VERIFIED_ROLE_ID });
  function fail(error) { failed = true; report('Academy startup or handler failed:', error); void shutdown.shutdown(); }
  function track(work) {
    if (stopping) return Promise.resolve();
    const task = Promise.resolve().then(work); tasks.add(task);
    void task.catch(fail).finally(() => tasks.delete(task)).catch(() => {});
    return task;
  }
  function onInteraction(interaction) {
    void track(async () => {
      if (await pauseRetainingAcademyInteraction(interaction)) return;
      const admitted = await gateCourse(interaction);
      if (admitted) await handleInteraction(withStudentEntry(admitted, guildId, certification.enabled === true && certification.ready === true));
    });
  }
  function onReady(readyClient) {
    void track(async () => {
      // Keep the legacy callback contract, but do not initialize profile/progress/badge storage during the hold.
      if (!stopping) { try { log(`NeptuneGuard Discord client connected as ${readyClient.user.tag}; legacy learner storage initialization remains paused.`); } catch {} }
    });
  }
  return Object.freeze({ shutdown: shutdown.shutdown, get stopping() { return stopping; },
    start(token) {
      if (started || stopping) throw new Error('Academy application cannot be started again');
      started = true; client.once(Events.ClientReady, onReady); client.on(Events.InteractionCreate, onInteraction);
      shutdown.install(); return track(() => client.login(token)).catch(() => {});
    }
  });
}
