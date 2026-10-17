import { randomUUID } from 'node:crypto';
import { createCertificationRouter } from './certification-admin-router.js';
import { createSectionLoginHandler } from './certification-section-login.js';
import { handleCertificationLearner } from './certification-learner.js';
import { createCertificationService } from './certification-service.js';
import { createStatusReadGuard } from './certification-status-read-guard.js';
const sectionKey = 'training-readiness';
const json = value => typeof value?.toJSON === 'function' ? value.toJSON() : value;

export function createRestorationRouter(pool, config, guildId, { now = Date.now } = {}) {
  const route = createCertificationRouter(pool, config, guildId), service = createCertificationService(pool, config);
  const grants = new Map(), reads = createStatusReadGuard({ now, limit: 30 });
  const purge = () => { for (const [token, grant] of grants) if (now() >= grant.expiresAt) grants.delete(token); };
  const leave = actor => { for (const [token, grant] of grants) if (grant.actor === actor) grants.delete(token); };
  const validContext = i => {
    const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
    return config.enabled === true && i.guildId === guildId && /^\d{17,20}$/.test(i.user?.id || '') &&
      !(i.message?.flags?.has?.(64) === true && origin && origin !== i.user.id);
  };
  const deny = i => {
    const payload = { content: 'Section login is required, expired, or unavailable. Enter the section again or check your application status.', embeds: [],
      components: [{ type: 1, components: [
        { type: 2, style: 1, custom_id: `cert:section:open:${sectionKey}`, label: 'Enter Training readiness' },
        { type: 2, style: 2, custom_id: 'cert:initial:home', label: 'Application status' }
      ] }], allowedMentions: { parse: [] } };
    return i.deferred || i.replied ? i.editReply(payload) : i.reply({ ...payload, flags: 64 });
  };
  function rewrite(payload, token) {
    if (!payload.components) return payload;
    return { ...payload, components: payload.components.map(row => {
      const data = json(row); return { ...data, components: data.components.map(component => {
        const item = json(component), match = /^cert:(lesson|help):training-readiness:(\d{1,6})$/.exec(item.custom_id || '');
        if (!match) return { ...item };
        return { ...item, custom_id: token ? `cert:section:page:${token}:${match[1]}:${match[2]}` : `cert:section:open:${sectionKey}` };
      }) };
    }) };
  }
  async function render(original, token, mode, page, alreadyDeferred = false) {
    const grant = grants.get(token);
    const live = () => validContext(original) && grants.get(token) === grant && grant && now() < grant.expiresAt;
    if (!live()) return deny(original);
    const adapter = new Proxy(original, { get(target, key) {
      if (key === 'customId') return `cert:${mode}:${sectionKey}:${page}`;
      if (key === 'isButton') return () => true;
      if (key === 'isModalSubmit' || key === 'isStringSelectMenu') return () => false;
      if (alreadyDeferred && key === 'message') return undefined;
      if (alreadyDeferred && (key === 'deferReply' || key === 'deferUpdate')) return async () => {};
      if (key === 'editReply') return payload => live() ? target.editReply(rewrite(payload, token)) : deny(target);
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    return handleCertificationLearner(adapter, config, guildId, { async getCourseAuthorization(actor) {
      try {
        const authorization = await reads.run(actor, () => service.getCourseAuthorization(actor));
        if (!authorization) grants.delete(token); return authorization;
      } catch { grants.delete(token); return null; }
    } });
  }
  const login = createSectionLoginHandler(pool, config, guildId, { sections: [sectionKey], now, async onVerified(interaction, section) {
    if (section !== sectionKey) throw new Error('Unsupported student section');
    purge(); leave(interaction.user.id);
    if (grants.size >= 1000) throw new Error('Section navigation capacity reached');
    const token = randomUUID(); grants.set(token, { actor: interaction.user.id, guildId, expiresAt: now() + 300000 });
    try { await render(interaction, token, 'lesson', 0, true); } catch (error) { grants.delete(token); throw error; }
  } });
  return async function routeRestoration(interaction) {
    purge(); const id = interaction.customId || '';
    if (id.startsWith('cert:section:page:')) {
      const match = /^cert:section:page:([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}):(lesson|help):(\d{1,6})$/.exec(id);
      const grant = match && grants.get(match[1]);
      if (!interaction.isButton?.() || !validContext(interaction) || !grant || grant.actor !== interaction.user.id || grant.guildId !== interaction.guildId) { await deny(interaction); return true; }
      await render(interaction, match[1], match[2], Number(match[3])); return true;
    }
    if (await login(interaction)) return true;
    if (id.startsWith('cert:lesson:') || id.startsWith('cert:help:')) { await deny(interaction); return true; }
    if (interaction.isButton?.() && ['cert:contents', 'cert:learner:home', 'cert:learner:status'].includes(id)) {
      if (!validContext(interaction)) { await deny(interaction); return true; }
      leave(interaction.user.id);
      if (id === 'cert:contents') {
        const adapter = new Proxy(interaction, { get(target, key) {
          if (key === 'editReply') return payload => target.editReply(rewrite(payload));
          const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
        } });
        return route(adapter);
      }
    }
    return route(interaction);
  };
}
