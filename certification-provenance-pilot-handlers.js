import { registrationPilotPolicy } from './certification-registration-pilot-policy.js';
import { createRegistrationPilotHandlers } from './certification-registration-pilot-handlers.js';
import { createOwnerRegistrationHandler } from './certification-owner-registration-ui.js';
import { createInvitationInteractionHandler } from './certification-invitation-interactions.js';
import { createProvenanceOwnerRegistrationService,createProvenanceInvitationReader } from './certification-registration-provenance.js';
import { createProvenanceInvitedSubmission } from './certification-provenance-submission.js';
// Standalone protected composition. Runtime must separately gate on combined readiness.
export function createProvenancePilotHandlers({readPool,writePool,config,guildId}={}){
  const scoped=Object.freeze({...config}),policy=registrationPilotPolicy(scoped);
  if(!policy||typeof policy.classify!=='function')throw new Error('Explicit protected pilot policy required');
  return createRegistrationPilotHandlers({readPool,writePool,config:scoped,guildId,
    createInvitationReader:createProvenanceInvitationReader,
    createRegistration(pool,settings,guild){
      const native=createOwnerRegistrationHandler(pool,settings,guild,{createRegistrationService:createProvenanceOwnerRegistrationService});
      return async interaction=>policy.classify(interaction)==='registration'?native(interaction):false;
    },
    createInvitation(pool,settings,guild){return createInvitationInteractionHandler(pool,settings,guild,{createSubmissionService:createProvenanceInvitedSubmission,createInvitationReader:createProvenanceInvitationReader});}
  });
}
