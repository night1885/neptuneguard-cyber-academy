// Detached composition of existing policy/readers/workspace; no listener, client or pool creation.
import { createFormalReviewRoute } from './route-boundary.mjs';
import { createFormalReviewAuthorization } from './formal-read-policy.mjs';
import { createTrustedReviewReaders } from './trusted-readers.mjs';
import { createReviewWorkspace } from './review-workspace.mjs';
import { FORMAL_REVIEW_COURSE } from './formal-course.mjs';
export function createTrustedFormalReviewRoute({ enabled = false, reviewOnly = false, mode = 'disabled',
  guildId, entryChannelId, verifiedRoleId, client, readPool, config, bundle, isReady, drainMs } = {}) {
  const ready = () => {
    try {
      const value = isReady();
      if (value && typeof value.catch === 'function') void value.catch(() => {});
      return value === true;
    } catch { return false; }
  };
  return createFormalReviewRoute({ enabled, reviewOnly, mode, guildId, entryChannelId, isReady: ready,
    ...(drainMs === undefined ? {} : { drainMs }), createWorkspace() {
      let authorize, readers, workspace;
      try {
        if (typeof isReady !== 'function') throw new TypeError('Synchronous parent readiness required');
        authorize = createFormalReviewAuthorization({ enabled: true, reviewOnly, readPool, config });
        readers = createTrustedReviewReaders({ enabled: true, reviewOnly, guildId, client, authorizeCourse: authorize });
        const guarded = read => async (...args) => {
          if (!ready()) return null;
          const result = await read(...args);
          return ready() ? result : null;
        };
        workspace = createReviewWorkspace({ enabled: true, guildId, entryChannelId, courseId: FORMAL_REVIEW_COURSE.key,
          verifiedRoleId, bundle, readMember: guarded(readers.readMember), readCourseGrant: guarded(readers.readCourseGrant) });
        return { handle: interaction => workspace.handle(interaction), dispose() {
          // Retire authority first so late provider results cannot authorize new pages.
          readers.dispose(); authorize.dispose(); workspace.dispose();
        } };
      } catch (error) {
        workspace?.dispose(); readers?.dispose(); authorize?.dispose(); throw error;
      }
    } });
}
