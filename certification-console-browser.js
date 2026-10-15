const statuses = ['all', 'awaiting_acknowledgment', 'pending', 'approved', 'denied', 'suspended', 'revoked'];
const clean = value => String(value ?? 'Not supplied').replace(/[`*_~|<>@]/g, '').slice(0, 100);
const button = (id, label, disabled = false) => ({ type: 2, style: 2, custom_id: id, label, disabled });
const row = (...components) => ({ type: 1, components });
const base = { allowedMentions: { parse: [] } };
const stamp = value => value instanceof Date ? value.toISOString() : clean(value);
export function formatAuditAction(action) { return clean(String(action ?? 'Not supplied').replaceAll('_', ' ')); }

export async function handleConsoleBrowser(interaction, pool, config, guildId) {
  const id = interaction.customId || '';
  if (!(interaction.isButton?.() || interaction.isModalSubmit?.()) || !(id.startsWith('cert:dir:') || id.startsWith('cert:audit:'))) return false;
  const reply = content => interaction.reply({ ...base, flags: 64, content });
  if (!config.enabled || interaction.user?.id !== config.ownerId || interaction.guildId !== guildId) {
    await reply('Owner authorization in the configured server is required.'); return true;
  }
  if (id === 'cert:dir:search' && interaction.isButton()) {
    await interaction.showModal({ custom_id: 'cert:dir:search', title: 'Find students / filter status', components: [
      row({ type: 4, custom_id: 'query', label: 'Exact Discord ID or permanent ID (optional)', style: 1, required: false, max_length: 48 }),
      row({ type: 4, custom_id: 'status', label: 'Status (blank = all)', placeholder: 'all, pending, approved, denied, suspended, revoked', style: 1, required: false, max_length: 24 })
    ] }); return true;
  }
  let status, query, page, audit = false;
  if (id === 'cert:dir:search' && interaction.isModalSubmit()) {
    query = interaction.fields.getTextInputValue('query').trim();
    status = interaction.fields.getTextInputValue('status').trim().toLowerCase() || 'all';
    page = 0;
  } else if (interaction.isButton()) {
    const directory = /^cert:dir:(all|awaiting_acknowledgment|pending|approved|denied|suspended|revoked):(\d{1,5}):([A-Za-z0-9-]{0,48})$/.exec(id);
    const history = /^cert:audit:(\d{1,5})$/.exec(id);
    if (directory) [, status, page, query] = directory;
    else if (history) { audit = true; page = history[1]; }
    else { await reply('Invalid browser action. Open the dashboard again.'); return true; }
    page = Number(page);
  } else { await reply('Invalid browser form. Open the dashboard again.'); return true; }
  if (!Number.isSafeInteger(page) || page < 0 || page > 10000 || (!audit && (!statuses.includes(status) || !/^[A-Za-z0-9-]{0,48}$/.test(query)))) {
    await reply('Invalid search. Use an exact Discord/permanent ID and a supported status.'); return true;
  }
  await interaction.deferReply({ flags: 64 });
  const result = audit
    ? await pool.query('SELECT event_id, actor_discord_user_id, subject_discord_user_id, action, created_at FROM certification_audit_events ORDER BY created_at DESC, event_id DESC LIMIT 6 OFFSET $1', [page * 5])
    : await pool.query(`SELECT discord_user_id, student_id, status, agreement_version, signature_method, acknowledged_at, learner_confirmed_read_at, comprehension_passed_at, age_eligible, age_declared_at, approved_at FROM certification_enrollments WHERE ($1::text='all' OR status=$1) AND ($2::text='' OR discord_user_id=$2 OR LOWER(student_id)=LOWER($2)) ORDER BY created_at, discord_user_id LIMIT 6 OFFSET $3`, [status, query, page * 5]);
  const entries = result.rows.slice(0, 5);
  const target = n => audit ? `cert:audit:${n}` : `cert:dir:${status}:${n}:${query}`;
  const components = [row(button('cert:admin:overview:0', 'Overview'), button('cert:dir:search', 'Search / filter students'), ...(audit ? [] : [button('cert:audit:0', 'Audit history')]))];
  if (!audit && entries.length) components.push(row(...entries.map((entry, index) => button(`cert:students:detail:${entry.discord_user_id}`, `Open student ${index + 1}`))));
  components.push(row(
    button(page === 0 ? 'cert:noop:browser:previous' : target(page - 1), 'Previous', page === 0),
    button(target(page), 'Refresh'),
    button(page >= 10000 ? 'cert:noop:browser:next' : target(page + 1), 'Next', result.rows.length <= 5 || page >= 10000)
  ));
  const fields = entries.map(entry => audit
    ? { name: `Event ${clean(entry.event_id)} — ${formatAuditAction(entry.action)}`, value: `Actor: ${clean(entry.actor_discord_user_id)}\nSubject: ${clean(entry.subject_discord_user_id)}\nTime: ${stamp(entry.created_at)}` }
    : { name: `Student ${clean(entry.discord_user_id)}`, value: `Permanent ID: ${clean(entry.student_id)}\nStatus: ${clean(entry.status)}\nAgreement: ${clean(entry.agreement_version)}\nAcknowledgment method: ${clean(entry.signature_method)}\nAcknowledged: ${entry.acknowledged_at ? 'Yes' : 'No'} | Read declaration: ${entry.learner_confirmed_read_at ? 'Yes' : 'No'} | Comprehension: ${entry.comprehension_passed_at ? 'Yes' : 'No'}\nSelf-declared age 18+: ${entry.age_eligible === true ? 'Yes' : entry.age_eligible === false ? 'No' : 'Not recorded'}\nAge declaration: ${stamp(entry.age_declared_at)}\nApproved: ${stamp(entry.approved_at)}` });
  await interaction.editReply({ ...base, content: '', embeds: [{ title: `${audit ? 'Audit history' : 'Student search'} — page ${page + 1}`, color: 0x3498db,
    description: audit ? `${entries.length ? 'Newest events first.' : 'No events on this page.'} Event details and private notes are intentionally omitted.` : `Status: ${clean(status)} | Exact ID: ${query ? clean(query) : 'Any'}\n${entries.length ? 'Open a student for existing access controls. Age eligibility is self-declared, not independently verified.' : 'No matching students on this page. Use Previous or change the filter.'}`, fields, footer: { text: 'Owner-only • Read-only • No records changed' } }], components });
  return true;
}
