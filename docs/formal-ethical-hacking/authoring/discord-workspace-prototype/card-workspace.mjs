// Detached draft card composition; no Discord client/event registration.
import { createWorkspace } from './navigation.mjs';
import { createAccessAdapter } from './access.mjs';
import { createCardRenderer } from './cards.mjs';
export function createCardReviewWorkspace({ enabled = false, guildId, entryChannelId, courseId,
  verifiedRoleId, readMember, readCourseGrant, bundle, clock, makeToken } = {}) {
  if (enabled !== true) return createWorkspace();
  const content = createCardRenderer({ courseId, bundle });
  const authorize = createAccessAdapter({ enabled: true, guildId, courseId, verifiedRoleId, readMember, readCourseGrant });
  return createWorkspace({ enabled: true, allowCards: true, guildId, entryChannelId, courseId,
    pages: content.pageCount, authorize, render: content.render,
    ...(clock === undefined ? {} : { clock }), ...(makeToken === undefined ? {} : { makeToken }) });
}
