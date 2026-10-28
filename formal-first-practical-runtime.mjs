import {createFormalFirstJourneyNavigation} from './formal-first-journey-navigation.mjs';
import {createFormalDraftLessonLoader} from './formal-first-journey-content.mjs';
import {createFormalCourseAuthorizer} from './formal-course-authorizer.mjs';
const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
export function createFirstPracticalRuntimeOptions(options={}){
 if(options.enabled!==true)return Object.freeze({enabled:false});
 const {reviewOnly,mode,allowDraftPreview,allowReadOnlyWorksheet=false,entryChannelId,service,repositoryRoot,now=Date.now,sessionTtlMs=300000,maxSessions=20,providerTimeoutMs=250,drainMs=1000}=options;
 if(reviewOnly!==true||mode!=='review'||allowDraftPreview!==true||typeof allowReadOnlyWorksheet!=='boolean'||!id(entryChannelId)||typeof now!=='function'||!Number.isSafeInteger(drainMs)||drainMs<5||drainMs>2000)throw new Error('Explicit first-practical source-review profile required');
 const authorizeCourse=createFormalCourseAuthorizer(service);
 const loadPage=createFormalDraftLessonLoader({allowDraftContent:true,allowReadOnlyWorksheet,...(repositoryRoot===undefined?{}:{repositoryRoot})});
 return Object.freeze({enabled:true,reviewOnly:true,mode:'review',interactionPrefix:'fnv:',drainMs:drainMs+1000,
  createRoute({guildId,config,isReady}){
   if(config?.enabled!==true||config.enrollmentSubmissionEnabled!==false||!config.activeAgreementVersion||typeof isReady!=='function')throw new Error('Admitted read-only parent required');
   const route=createFormalFirstJourneyNavigation({enabled:true,allowDraftPreview:true,allowReadOnlyWorksheet,guildId,entryChannelId,courseKey:'ethical-hacking',sessionTtlMs,maxSessions,providerTimeoutMs,drainMs},{isReady,authorizeCourse,loadPage,now});
   return Object.freeze({enabled:true,handle:i=>route.handle(i),dispose:()=>route.dispose()});
  }
 });
}
