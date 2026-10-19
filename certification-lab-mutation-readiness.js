const expected = { request_id:['uuid',true], discord_user_id:['text',true],
  status:['text',true], status_reason:['text',false], updated_at:['timestamp with time zone',true] };
export async function validateLabMutationColumns(pool) {
  const rows=(await pool.query(`SELECT c.relkind,a.attname,format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull,a.atthasdef,a.attgenerated,a.attidentity
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
    WHERE c.oid=to_regclass('certification_lab_requests')
    AND a.attname=ANY($1::text[]) AND a.attnum>0 AND NOT a.attisdropped`,[Object.keys(expected)])).rows;
  const columns=new Map(rows.map(a=>[a.attname,a]));
  for (const [name,[type,required]] of Object.entries(expected)) {
    const a=columns.get(name);
    if (!a || a.relkind!=='r' || a.type!==type || a.attnotnull!==required ||
      a.attgenerated!=='' || a.attidentity!=='') throw new Error('Lab mutation schema unavailable');
  }
  if (columns.get('status_reason').atthasdef!==false) throw new Error('Lab mutation schema unavailable');
}
export async function admitLabMutation(pool,interaction) {
  try { await validateLabMutationColumns(pool); return true; }
  catch {
    await interaction.editReply({ content:'Lab authorization changes are unavailable because schema readiness could not be confirmed. No lab-management mutation was admitted by this confirmation. Ask the operator to review the schema before retrying.',
      embeds:[],components:[],allowedMentions:{parse:[]} });
    return false;
  }
}
