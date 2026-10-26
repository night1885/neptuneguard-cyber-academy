// Detached draft catalogue composition; no client, event handler or file loader.
import { createWorkspace } from './navigation.mjs';
import { createAccessAdapter } from './access.mjs';
import { createCatalogueRenderer } from './catalogue.mjs';
export function createCatalogueReviewWorkspace({ enabled = false, guildId, entryChannelId, courseId,
  verifiedRoleId, readMember, readCourseGrant, catalogue, labels, clock, makeToken } = {}) {
  if (enabled !== true) return createWorkspace();
  const content = createCatalogueRenderer({ courseId, catalogue, labels });
  const authorize = createAccessAdapter({ enabled: true, guildId, courseId, verifiedRoleId, readMember, readCourseGrant });
  return createWorkspace({ enabled: true, allowCards: true, guildId, entryChannelId, courseId,
    pages: content.pageCount, authorize, render: content.render,
    ...(clock === undefined ? {} : { clock }), ...(makeToken === undefined ? {} : { makeToken }) });
}
