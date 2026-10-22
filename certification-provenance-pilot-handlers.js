import { registrationPilotPolicy } from './certification-registration-pilot-policy.js';
import { createRegistrationPilotHandlers } from './certification-registration-pilot-handlers.js';
import { createOwnerRegistrationHandler } from './certification-owner-registration-ui.js';
import { createInvitationInteractionHandler } from './certification-invitation-interactions.js';
import { createProvenanceOwnerRegistrationService,createProvenanceInvitationReader } from './certification-registration-provenance.js';
import { createProvenanceInvitedSubmission } from './certification-provenance-submission.js';
import { createManualReviewInvitationHandler } from './certification-manual-review-invitation.mjs';
// Named native factories keep the runtime dependency interface stable; their backends are pinned.
export function createProvenanceOwnerRegistrationHandler(pool,config,guildId){
  const policy=registrationPilotPolicy(config);
  if(!policy||typeof policy.classify!=='function')throw new Error('Explicit protected pilot policy required');
  const native=createOwnerRegistrationHandler(pool,config,guildId,{createRegistrationService:createProvenanceOwnerRegistrationService});
  return async interaction=>policy.classify(interaction)==='registration'?native(interaction):false;
}
export function createProvenanceInvitationHandler(pool,config,guildId){
  if(config.manualReviewEnabled===true)return createManualReviewInvitationHandler(pool,config,guildId);
  return createInvitationInteractionHandler(pool,config,guildId,{createSubmissionService:createProvenanceInvitedSubmission,createInvitationReader:createProvenanceInvitationReader});
}
export function createProvenancePilotHandlers({readPool,writePool,config,guildId,createRegistration,createInvitation}={}){
  const scoped=Object.freeze({...config}),policy=registrationPilotPolicy(scoped);
  if(!policy||typeof policy.classify!=='function')throw new Error('Explicit protected pilot policy required');
  if((createRegistration!==undefined&&createRegistration!==createProvenanceOwnerRegistrationHandler)||(createInvitation!==undefined&&createInvitation!==createProvenanceInvitationHandler))throw new Error('Protected native factories are pinned');
  return createRegistrationPilotHandlers({readPool,writePool,config:scoped,guildId,createInvitationReader:createProvenanceInvitationReader,createRegistration:createProvenanceOwnerRegistrationHandler,createInvitation:createProvenanceInvitationHandler});
}
