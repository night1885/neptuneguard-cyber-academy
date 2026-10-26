// Detached reading composition. Providers/snapshots are supplied by reviewed server code.
import { createWorkspace } from './navigation.mjs';
import { createAccessAdapter } from './access.mjs';
import { createReadingCatalogueRenderer } from './reading-catalogue.mjs';
export function createReadingReviewWorkspace({ enabled = false, guildId, entryChannelId, courseId,
  verifiedRoleId, readMember, readCourseGrant, catalogue, labels, manifest, sources, clock, makeToken } = {}) {
  if (enabled !== true) return createWorkspace();
  const content = createReadingCatalogueRenderer({ courseId, catalogue, labels, manifest, sources });
  const authorize = createAccessAdapter({ enabled: true, guildId, courseId, verifiedRoleId, readMember, readCourseGrant });
  return createWorkspace({ enabled: true, allowCards: true, guildId, entryChannelId, courseId,
    pages: content.pageCount, authorize, render: content.render,
    ...(clock === undefined ? {} : { clock }), ...(makeToken === undefined ? {} : { makeToken }) });
}
