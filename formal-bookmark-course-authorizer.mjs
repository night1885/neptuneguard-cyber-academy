import { createCertificationCourseLifecycle } from './certification-course-lifecycle.js';
// Uses the transaction's connection; never a second pool or a client-supplied approval flag.
export function createFormalBookmarkAuthorization(config) {
  const settings = Object.freeze({...config,comprehensionCheck:config?.comprehensionCheck?Object.freeze({...config.comprehensionCheck}):undefined});
  return async (db,{actorId,courseKey}) => {
    const service = createCertificationCourseLifecycle({query:(sql,values)=>db.query(sql,values)},settings,{courseKeys:['ethical-hacking','incident-response']});
    return service.getCourseAuthorization(actorId,courseKey);
  };
}
