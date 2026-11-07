const id = value => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const uuid = '[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}';
const registrationButton = new RegExp(`^cert:register:(?:open|(?:confirm|cancel):${uuid})$`);
const invitationButton = new RegExp(`^cert:invite:(?:start|(?:previous|next|form|cancel):${uuid})$`);
const invitationModal = new RegExp(`^cert:invite:send:${uuid}$`);
const reviewOpen = /^cert:review:open:([0-9]{17,20})$/;
const reviewButton = new RegExp(`^cert:review:(?:choose:(?:approve|deny):|(?:confirm|cancel):)${uuid}$`);
const reviewModal = new RegExp(`^cert:review:reason:(?:approve|deny):${uuid}$`);
const accessAction = /^cert:access:(suspend|revoke):[0-9]{17,20}$/;
const accessSession = new RegExp(`^cert:access:(confirm|cancel):${uuid}$`);
const learnerRead = value => /^cert:(?:initial:(?:home|status|help)|learner:(?:home|status))$/.test(value);
const sections = new Set(['overview','enrollments','labs','students','courses']);
function ownerRead(value) {
  return /^cert:admin:(overview|enrollments|labs):[0-9]{1,6}$/.test(value) ||
    /^cert:admin:courses:(?:[0-9]{1,6}|course:[0-9]{1,6}:[0-9]{1,6}|module:[0-9]{1,6}:[0-9]{1,6}:[0-9]{1,6})$/.test(value) ||
    /^cert:students:(?:list:[0-9]{1,6}|detail:[0-9]{17,20})$/.test(value) ||
    /^cert:dir:(?:all|awaiting_acknowledgment|pending|approved|denied|suspended|revoked):[0-9]{1,5}:[A-Za-z0-9-]{0,48}$/.test(value) ||
    /^cert:student-audit:[0-9]{17,20}:[0-9]{1,5}$/.test(value) ||
    /^cert:audit:[0-9]{1,5}$/.test(value) || ['cert:dir:search','cert:console:settings'].includes(value);
}
export function readGeneralRegistrationScope(env = {}) {
  const scope = env.CERTIFICATION_REGISTRATION_SCOPE;
  if (scope === undefined || scope === 'restricted') return false;
  if (scope !== 'guild-members') throw new Error('Invalid registration scope');
  return true;
}
export function isGeneralRegistrationScope(s) {
  return Boolean(s && Object.isFrozen(s) && s.enabled === true && s.combined === true && s.generalMembers === true &&
    id(s.ownerId) && id(s.guildId) && id(s.adminChannelId) && id(s.verifiedRoleId) &&
    Array.isArray(s.studentIds) && Object.isFrozen(s.studentIds) && s.studentIds.length === 0);
}
export function isVerifiedRegistrationMember(member, s, userId) {
  return isGeneralRegistrationScope(s) && id(userId) && member?.id === userId && member.guild?.id === s.guildId &&
    member.user?.id === userId && member.user.bot === false && member.pending !== true &&
    member.roles?.cache?.has?.(s.verifiedRoleId) === true;
}
export function isGeneralRegistrationActor(i, s) {
  return isGeneralRegistrationScope(s) && i?.guildId === s.guildId && i.guild?.id === s.guildId && i.user?.bot === false &&
    isVerifiedRegistrationMember(i.member, s, i.user.id);
}
export async function requireGeneralRegistrationTarget(i, s, userId) {
  if (!isGeneralRegistrationScope(s) || i?.user?.id !== s.ownerId || i.guildId !== s.guildId ||
      i.guild?.id !== s.guildId || i.channelId !== s.adminChannelId || !id(userId) || userId === s.ownerId ||
      typeof i.guild.members?.fetch !== 'function') throw new Error('Owner invitation in the configured admin channel required');
  const member = await i.guild.members.fetch({ user: userId, force: true });
  if (!isVerifiedRegistrationMember(member, s, userId)) throw new Error('A current verified human server member is required');
  return member;
}
export function createGeneralRegistrationPolicy(settings, { ownerDecisionsEnabled = false } = {}) {
  if (!isGeneralRegistrationScope(settings) || typeof ownerDecisionsEnabled !== 'boolean') throw new Error('Explicit general registration scope required');
  const s = Object.freeze({ ...settings, studentIds: Object.freeze([]) });
  const allowsStudent = actor => id(actor) && actor !== s.ownerId;
  const decisionButton = value => {
    if (!ownerDecisionsEnabled) return false;
    const open = reviewOpen.exec(value);
    return open ? allowsStudent(open[1]) : reviewButton.test(value);
  };
  return Object.freeze({
    ...(ownerDecisionsEnabled ? { ownerDecisionsEnabled: true } : {}),
    allowsStudent,
    assertTarget(actor) { if (!allowsStudent(actor)) throw new Error('A valid non-owner registration target is required'); },
    owner: actor => actor === s.ownerId,
    allowsButton(actor, value) {
      if (typeof value !== 'string') return false;
      return actor === s.ownerId ? ownerRead(value) || registrationButton.test(value) || decisionButton(value) || accessAction.test(value) || accessSession.test(value) || /^cert:initial:(?:home|status|help)$/.test(value)
        : allowsStudent(actor) && (invitationButton.test(value) || learnerRead(value));
    },
    allowsModal(actor, value) {
      if (typeof value !== 'string') return false;
      return actor === s.ownerId ? ['cert:register:submit','cert:dir:search'].includes(value) || accessAction.test(value) || (ownerDecisionsEnabled && reviewModal.test(value))
        : allowsStudent(actor) && invitationModal.test(value);
    },
    classify(i) {
      const actor = i.user?.id, value = i.customId;
      const b = i.isButton?.() === true, m = i.isModalSubmit?.() === true, menu = i.isStringSelectMenu?.() === true;
      const origin = i.message?.interactionMetadata?.user?.id || i.message?.interaction?.user?.id;
      if ([b,m,menu].filter(Boolean).length !== 1 || !id(actor) || typeof value !== 'string' ||
          i.guildId !== s.guildId || i.guild?.id !== s.guildId || (i.message?.flags?.has?.(64) === true && origin !== actor)) return null;
      if (actor === s.ownerId) {
        if (i.channelId !== s.adminChannelId) return null;
        if ((accessAction.test(value) && (b || m)) || (b && accessSession.test(value) && i.message?.flags?.has?.(64) === true)) return 'management';
        if (ownerDecisionsEnabled && ((b && decisionButton(value) && (reviewOpen.test(value) || i.message?.flags?.has?.(64) === true)) ||
            (m && reviewModal.test(value) && i.message?.flags?.has?.(64) === true))) return 'decision';
        if (m && value === 'cert:register:submit') {
          try { return allowsStudent(i.fields.getTextInputValue('discord_user_id').trim()) ? 'registration' : null; } catch { return null; }
        }
        if (b && registrationButton.test(value)) return 'registration';
        if (m && value === 'cert:dir:search') return 'read';
        if (menu && value === 'cert:admin:section' && Array.isArray(i.values) && i.values.length === 1 && sections.has(i.values[0])) return 'read';
        return b && ownerRead(value) ? 'read' : null;
      }
      if (!allowsStudent(actor) || !isGeneralRegistrationActor(i, s)) return null;
      return (b && (invitationButton.test(value) || learnerRead(value))) || (m && invitationModal.test(value)) ? 'learner' : null;
    }
  });
}
