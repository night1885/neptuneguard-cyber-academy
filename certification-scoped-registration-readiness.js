// Readiness orchestration only. The parent must keep admission closed until this resolves.
// Production validators are loaded lazily; supplied overrides are trusted test dependencies.
const names=['registration','agreement','lifecycle','requests'];
async function defaults(){
  const [r,a,l,q]=await Promise.all([
    import('./certification-pilot-runtime-readiness.js'),
    import('./certification-schema-readiness.js'),
    import('./certification-course-readiness.js'),
    import('./certification-course-request-readiness.js')
  ]);
  return {registration:r.validateRuntimeCertificationSchema,agreement:a.validateActiveEnrollmentAgreement,
    lifecycle:l.validateCourseLifecycleReadiness,requests:q.validateCourseRequestReadiness};
}
export async function validateScopedRegistrationCourseReadiness({pool,config,connection,decisions}={}, overrides){
  if(typeof pool?.query!=='function'||typeof pool?.connect!=='function'||
    config?.enabled!==true||config.manualReviewEnabled!==true||config.manualReviewDecisionsEnabled!==true||
    config.enrollmentSubmissionEnabled!==false||config.courseRequestsEnabled!==true||config.scopedRegistration?.enabled!==true||
    typeof connection?.connectionString!=='string'||!connection.connectionString||
    typeof decisions?.initialize!=='function')throw new Error('Explicit scoped combined-runtime dependencies required');
  const validators=overrides===undefined?await defaults():overrides;
  if(!validators||names.some(k=>typeof validators[k]!=='function'))throw new Error('Complete trusted readiness validators required');
  // Passing the descriptor is essential: omission selects only base schema checks.
  await validators.registration(pool,{pilotConnection:connection});
  await validators.agreement(pool,config);
  const lifecycle=await validators.lifecycle(pool);
  if(lifecycle?.ready!==true)throw new Error('Course lifecycle readiness unconfirmed');
  const requests=await validators.requests(pool);
  if(requests?.ready!==true)throw new Error('Course request readiness unconfirmed');
  const decision=await decisions.initialize();
  if(decision?.ready!==true)throw new Error('Owner-decision readiness unconfirmed');
  return Object.freeze({ready:true});
}
