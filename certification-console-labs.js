const statuses = ['all', 'pending', 'approved', 'denied', 'suspended', 'revoked', 'expired'];
const safe = value => String(value ?? 'Not supplied').replace(/[`*_~|<>@]/g, '').slice(0, 100);
const stamp = value => value instanceof Date ? value.toISOString() : safe(value);
const button = (custom_id, label, disabled = false) => ({ type: 2, style: 2, custom_id, label, disabled });
const row = (...components) => ({ type: 1, components });
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';

export async function handleConsoleLabs(interaction, pool, config, guildId) {
  const id = interaction.customId || '';
  if (!interaction.isButton?.() || !id.startsWith('cert:labview:')) return false;
  const allowedMentions = { parse: [] };
  if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.reply({ content: 'Owner authorization in the configured server is required.', flags: 64, allowedMentions }); return true;
  }
  const list = /^cert:labview:(all|pending|approved|denied|suspended|revoked|expired):(\d{1,5})$/.exec(id);
  const detail = new RegExp(`^cert:labview:detail:(${uuid})$`).exec(id);
  if ((!list && !detail) || (list && Number(list[2]) > 10000)) {
    await interaction.reply({ content: 'Invalid lab-record action. Open Lab records again.', flags: 64, allowedMentions }); return true;
  }
  await interaction.deferReply({ flags: 64 });
  const components = [row(button('cert:admin:overview:0', 'Overview'), button('cert:console:settings', 'Configuration'))];
  let embed;
  if (detail) {
    const result = await pool.query('SELECT request_id, discord_user_id, lab_key, status, rules_version, rules_acknowledged_at, starts_at, expires_at, approved_by, approved_at FROM certification_lab_requests WHERE request_id=$1::uuid', [detail[1]]);
    const record = result.rows[0];
    if (!record) {
      await interaction.editReply({ content: 'Lab request not found. No records changed.', embeds: [], components: [...components, row(button('cert:labview:all:0', 'All lab records'))], allowedMentions }); return true;
    }
    embed = { title: 'Lab authorization record', color: 0x3498db,
      description: 'Read-only inspection. This is not proof of a running session or permission to launch one. Scope details and private notes are not displayed by this view.',
      fields: [
        { name: 'Request', value: safe(record.request_id) },
        { name: 'Student Discord ID', value: safe(record.discord_user_id), inline: true },
        { name: 'Lab', value: safe(record.lab_key), inline: true },
        { name: 'Stored authorization status', value: safe(record.status), inline: true },
        { name: 'Rules version', value: safe(record.rules_version), inline: true },
        { name: 'Rules acknowledged', value: stamp(record.rules_acknowledged_at), inline: true },
        { name: 'Recorded start', value: stamp(record.starts_at), inline: true },
        { name: 'Recorded expiry', value: stamp(record.expires_at), inline: true },
        { name: 'Approved by', value: safe(record.approved_by), inline: true },
        { name: 'Approval time', value: stamp(record.approved_at), inline: true }
      ] };
    components.push(row(button('cert:labview:all:0', 'All lab records'), button(id, 'Refresh request')));
  } else {
    const status = list[1], page = Number(list[2]);
    const result = await pool.query(`SELECT request_id, discord_user_id, lab_key, status, starts_at, expires_at FROM certification_lab_requests WHERE ($1::text='all' OR status=$1) ORDER BY created_at DESC, request_id DESC LIMIT 6 OFFSET $2`, [status, page * 5]);
    const records = result.rows.slice(0, 5);
    embed = { title: `Lab records — ${status} — page ${page + 1}`, color: 0x3498db,
      description: `${records.length ? 'Select a request to inspect its recorded authorization.' : 'No matching lab records on this page.'} Authorization status is not provider-session status. No approval, launch, or termination is performed.`,
      fields: records.map(record => ({ name: `Request ${safe(record.request_id)}`, value: `Student: ${safe(record.discord_user_id)}\nLab: ${safe(record.lab_key)}\nStatus: ${safe(record.status)}\nStart: ${stamp(record.starts_at)}\nExpiry: ${stamp(record.expires_at)}` })) };
    if (records.length) components.push(row(...records.map((record, index) => button(`cert:labview:detail:${record.request_id}`, `Request ${index + 1}`))));
    components.push(row(
      button(page === 0 ? 'cert:noop:labs:previous' : `cert:labview:${status}:${page - 1}`, 'Previous', page === 0),
      button(`cert:labview:${status}:${page}`, 'Refresh'),
      button(page === 10000 ? 'cert:noop:labs:next' : `cert:labview:${status}:${page + 1}`, 'Next', result.rows.length <= 5 || page === 10000)
    ));
    const filters = statuses.filter(value => value !== status).map(value => button(`cert:labview:${value}:0`, value === 'all' ? 'All statuses' : value));
    for (let i = 0; i < filters.length; i += 5) components.push(row(...filters.slice(i, i + 5)));
  }
  await interaction.editReply({ content: '', embeds: [{ ...embed, footer: { text: 'Owner-only • Read-only • No provider calls' } }], components, allowedMentions });
  return true;
}
