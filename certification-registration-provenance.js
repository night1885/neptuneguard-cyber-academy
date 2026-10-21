import { registrationPilotPolicy } from './certification-registration-pilot-policy.js';
const isId=value=>typeof value==='string'&&/^[0-9]{17,20}$/.test(value);
export const PROVENANCE_INVITATION_SQL=`SELECT 1 AS invited
  FROM certification_enrollments e
  WHERE e.discord_user_id=$1 AND e.registration_owner_id=$2
    AND e.status='awaiting_acknowledgment'
    AND e.student_id IS NULL AND e.approved_by IS NULL AND e.approved_at IS NULL
    AND e.acknowledgment_name IS NULL AND e.signature_reference IS NULL
  LIMIT 1`;
function capture(config){
  if(!config||typeof config!=='object'||Array.isArray(config))throw new Error('Explicit registration configuration required');
  const policy=registrationPilotPolicy(config);
  return Object.freeze({enabled:config.enabled===true,ownerId:config.ownerId,policy});
}
// Staged replacements only: callers must separately integrate schema/role readiness.
export function createProvenanceOwnerRegistrationService(pool,config){
  const scope=capture(config);
  return Object.freeze({async register(actorId,discordUserId){
    if(!scope.enabled||!isId(scope.ownerId)||actorId!==scope.ownerId)throw new Error('Owner authorization required');
    if(!isId(discordUserId))throw new Error('Invalid student Discord ID');
    if(scope.policy){if(!scope.policy.owner(actorId))throw new Error('Pilot owner authorization required');scope.policy.assertTarget(discordUserId);}
    const db=await pool.connect();let discard=false;
    try{
      await db.query('BEGIN');
      const inserted=await db.query(`INSERT INTO certification_enrollments(discord_user_id,status,registration_owner_id) VALUES($1,'awaiting_acknowledgment',$2) ON CONFLICT(discord_user_id) DO NOTHING RETURNING discord_user_id,status,student_id`,[discordUserId,scope.ownerId]);
      let record=inserted.rows[0];const created=Boolean(record);
      if(created)await db.query(`INSERT INTO certification_audit_events(actor_discord_user_id,subject_discord_user_id,action,details) VALUES($1,$2,'student_registered_by_owner',$3::jsonb)`,[scope.ownerId,discordUserId,JSON.stringify({status:'awaiting_acknowledgment',accessGranted:false})]);
      else{record=(await db.query('SELECT discord_user_id,status,student_id FROM certification_enrollments WHERE discord_user_id=$1',[discordUserId])).rows[0];if(!record)throw new Error('Student record changed concurrently; retry registration');}
      await db.query('COMMIT');return {created,record};
    }catch(error){try{await db.query('ROLLBACK');}catch{discard=true;}throw error;}
    finally{db.release(discard);}
  }});
}
export function createProvenanceInvitationReader(pool,config){
  const scope=capture(config);
  return Object.freeze({async hasPendingInvitation(discordUserId){
    if(!scope.enabled||!isId(scope.ownerId)||!isId(discordUserId)||scope.policy&&!scope.policy.allowsStudent(discordUserId))return false;
    const result=await pool.query(PROVENANCE_INVITATION_SQL,[discordUserId,scope.ownerId]);
    return result.rows.length===1&&result.rows[0].invited===1;
  }});
}
