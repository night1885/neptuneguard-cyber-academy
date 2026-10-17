import { buildLabActionControls, createLabActionHandler } from './certification-lab-actions.js';
import { handleLabReview } from './certification-console-lab-review.js';
const statuses = ['all', 'pending', 'approved', 'denied', 'suspended', 'revoked', 'expired'];
const safe = value => String(value ?? 'Not supplied').replace(/[`*_~|<>@]/g, '').slice(0, 100);
const stamp = value => value instanceof Date ? value.toISOString() : safe(value);
const button = (custom_id, label, disabled = false) => ({ type: 2, style: 2, custom_id, label, disabled });
const row = (...components) => ({ type: 1, components });
const uuid = '[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}';

export function createConsoleLabController(pool, config, guildId) {
  const action = createLabActionHandler(pool, config, guildId);
  return async interaction => (await action(interaction)) || handleConsoleLabs(interaction, pool, config, guildId);
}
export async function handleConsoleLabs(interaction, pool, config, guildId) {
  if (await handleLabReview(interaction, pool, config, guildId)) return true;
  const id = interaction.customId || '';
  if (!interaction.isButton?.() || !id.startsWith('cert:labview:')) return false;
  const allowedMentions = { parse: [] };
  if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await interaction.reply({ content: 'Admin authorization in the configured server is required.', flags: 64, allowedMentions }); return true;
  }
  const globalList = /^cert:labview:(all|pending|approved|denied|suspended|revoked|expired):(\d{1,5})$/.exec(id);
  const studentList = /^cert:labview:student:(\d{17,20}):(all|pending|approved|denied|suspended|revoked|expired):(\d{1,5})$/.exec(id);
  const list = globalList ? { student: null, status: globalList[1], page: Number(globalList[2]) }
    : studentList ? { student: studentList[1], status: studentList[2], page: Number(studentList[3]) } : null;
  const detail = new RegExp(`^cert:labview:detail:(${uuid})$`).exec(id);
  if ((!list && !detail) || (list && list.page > 10000)) {
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
      description: 'Inspection does not change records. Denial/revocation requires a reason and separate confirmation. This is not proof of a running session or permission to launch one. Scope details and private notes are not displayed by this view.',
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
    const studentLinks = typeof record.discord_user_id === 'string' && /^\d{17,20}$/.test(record.discord_user_id)
      ? [button(`cert:students:detail:${record.discord_user_id}`, 'Student access record'), button(`cert:labview:student:${record.discord_user_id}:all:0`, 'This learner\'s lab records')] : [];
    components.push(row(button('cert:labview:all:0', 'All lab records'), button(id, 'Refresh request'), ...studentLinks, button(`cert:labview:review:${record.request_id}`, 'Review prerequisites')), ...buildLabActionControls(record.request_id, record.status));
  } else {
    const { student, status, page } = list;
    const target = (filter, number) => student ? `cert:labview:student:${student}:${filter}:${number}` : `cert:labview:${filter}:${number}`;
    if (student) components[0].components.push(button(`cert:students:detail:${student}`, 'Student access record'), button('cert:labview:all:0', 'All lab records'));
    const result = student
      ? await pool.query(`SELECT request_id, discord_user_id, lab_key, status, starts_at, expires_at FROM certification_lab_requests WHERE discord_user_id=$1 AND ($2::text='all' OR status=$2) ORDER BY created_at DESC, request_id DESC LIMIT 6 OFFSET $3`, [student, status, page * 5])
      : await pool.query(`SELECT request_id, discord_user_id, lab_key, status, starts_at, expires_at FROM certification_lab_requests WHERE ($1::text='all' OR status=$1) ORDER BY created_at DESC, request_id DESC LIMIT 6 OFFSET $2`, [status, page * 5]);
    const records = result.rows.slice(0, 5);
    embed = { title: `${student ? 'Student lab records' : 'Lab records'} — ${status} — page ${page + 1}`, color: 0x3498db,
      description: `${student ? `Student Discord ID: ${student}\n` : ''}${records.length ? 'Select a request to inspect its recorded authorization.' : 'No matching lab records on this page.'} Authorization status is not provider-session status. No approval, launch, or termination is performed.`,
      fields: records.map(record => ({ name: `Request ${safe(record.request_id)}`, value: `Student: ${safe(record.discord_user_id)}\nLab: ${safe(record.lab_key)}\nStatus: ${safe(record.status)}\nStart: ${stamp(record.starts_at)}\nExpiry: ${stamp(record.expires_at)}` })) };
    if (records.length) components.push(row(...records.map((record, index) => button(`cert:labview:detail:${record.request_id}`, `Request ${index + 1}`))));
    components.push(row(
      button(page === 0 ? 'cert:noop:labs:previous' : target(status, page - 1), 'Previous', page === 0),
      button(target(status, page), 'Refresh'),
      button(page === 10000 ? 'cert:noop:labs:next' : target(status, page + 1), 'Next', result.rows.length <= 5 || page === 10000)
    ));
    const filters = statuses.filter(value => value !== status).map(value => button(target(value, 0), value === 'all' ? 'All statuses' : value));
    for (let i = 0; i < filters.length; i += 5) components.push(row(...filters.slice(i, i + 5)));
  }
  await interaction.editReply({ content: '', embeds: [{ ...embed, footer: { text: 'Admin-only • Inspection is read-only • No provider calls' } }], components, allowedMentions });
  return true;
}
