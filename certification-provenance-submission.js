import { createCertificationSubmission } from './certification-submission.js';
import { createProvenanceInvitationReader } from './certification-registration-provenance.js';
// Staged invited-only adapter. Factory dependency is trusted code, never request input.
export function createProvenanceInvitedSubmission(pool,config){
  if(!config||typeof config!=='object'||Array.isArray(config)||typeof config.ownerId!=='string'||!/^[0-9]{17,20}$/.test(config.ownerId))throw new Error('Explicit provenance submission configuration required');
  const scoped=Object.freeze({...config});
  const service=createCertificationSubmission(pool,scoped,{createInvitationReader:createProvenanceInvitationReader});
  return Object.freeze({submitInvitedEnrollment:service.submitInvitedEnrollment});
}
