// Explicit synthetic-review composition; never installs an event listener.
import { createWorkspace } from './navigation.mjs';
import { createAccessAdapter } from './access.mjs';
import { createContentAdapter } from './content.mjs';

export function createReviewWorkspace({ enabled = false, guildId, entryChannelId, courseId,
  verifiedRoleId, readMember, readCourseGrant, bundle, clock, makeToken,
  readTimeoutMs = 400 } = {}) {
  if (enabled !== true) return createWorkspace();
  const content = createContentAdapter({ courseId, bundle });
  const authorize = createAccessAdapter({ enabled: true, guildId, courseId, verifiedRoleId,
    readMember, readCourseGrant, readTimeoutMs });
  return createWorkspace({ enabled: true, guildId, entryChannelId, courseId,
    pages: content.pageCount, authorize, render: content.render,
    ...(clock === undefined ? {} : { clock }), ...(makeToken === undefined ? {} : { makeToken }) });
}
