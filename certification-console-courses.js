import { ActionRowBuilder } from 'discord.js';
import { handleConsoleCourses as renderCourseView } from './certification-console-course-view.js';
import * as formalPreview from './certification-formal-admin-preview.mjs';
export { courseContentText } from './certification-console-course-view.js';

export function handleConsoleCourses(interaction, config, guildId) {
  // The academy router adds navigation with builder methods; readers return API JSON.
  const adapter = new Proxy(interaction, {
    get(target, key) {
      if (key === 'editReply') return payload => target.editReply({
        ...payload,
        ...(payload.components ? { components: payload.components.map(row =>
          ActionRowBuilder.from(typeof row?.toJSON === 'function' ? row.toJSON() : row)) } : {})
      });
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  return renderCourseView(adapter, config, guildId, formalPreview);
}
