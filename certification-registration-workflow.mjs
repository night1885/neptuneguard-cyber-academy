import {readRegistrationPilotOptions,createRegistrationPilotPolicy} from './certification-registration-pilot-guard.js';
export function readRegistrationWorkflowOptions(env={}) {
  if(env.CERTIFICATION_MANUAL_REVIEW_ENABLED!=='true'||env.CERTIFICATION_COURSES_ENABLED!=='true')return readRegistrationPilotOptions(env);
  const expected={CERTIFICATION_ENABLED:'true',CERTIFICATION_REGISTRATION_PILOT:'false',CERTIFICATION_READ_ONLY_PREVIEW:'false',CERTIFICATION_ENROLLMENT_SUBMISSION_ENABLED:'false',CERTIFICATION_APPLICATION_CLOSURE_ENABLED:'false',CERTIFICATION_MANUAL_REVIEW_DECISIONS_ENABLED:'true',CERTIFICATION_COURSE_REQUESTS_ENABLED:'true'};
  for(const [key,value]of Object.entries(expected))if(env[key]!==value)throw Error(`Combined registration requires explicit ${key}=${value}`);
  const list=env.CERTIFICATION_REGISTRATION_PILOT_STUDENT_IDS;
  if(typeof list!=='string'||list.length>104||!/^[0-9]{17,20}(,[0-9]{17,20}){0,4}$/.test(list))throw Error('Existing explicit registration target list required');
  const s={enabled:true,combined:true,ownerId:env.ACADEMY_OWNER_ID,guildId:env.GUILD_ID,adminChannelId:env.ACADEMY_ADMIN_CHANNEL_ID,studentIds:Object.freeze(list.split(','))};
  createRegistrationPilotPolicy(s,{ownerDecisionsEnabled:true});
  return Object.freeze(s);
}
