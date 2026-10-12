export function loadCertificationConfig(env = process.env) {
  const ownerId = env.ACADEMY_OWNER_ID || '1223123544301633567';
  const adminChannelId = env.ACADEMY_ADMIN_CHANNEL_ID || '1339276399390887956';
  for (const [name, value] of Object.entries({ ownerId, adminChannelId })) {
    if (!/^\d{17,20}$/.test(value)) throw new Error(`Invalid certification ${name}`);
  }
  return Object.freeze({ ownerId, adminChannelId, enabled: env.CERTIFICATION_ENABLED === 'true' });
}

export function isCertificationOwner(interaction, config) {
  return interaction.user?.id === config.ownerId;
}
