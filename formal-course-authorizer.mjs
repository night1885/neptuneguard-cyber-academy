const id=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const key=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9-]{0,39}$/.test(x);
export function createFormalCourseAuthorizer(service){
 if(typeof service?.getCourseAuthorization!=='function')throw new Error('Reviewed course authorization service required');
 return async({actorId,courseKey})=>{
  if(!id(actorId)||!key(courseKey))return null;
  const r=await service.getCourseAuthorization(actorId,courseKey);
  if(typeof r?.student_id!=='string'||!r.student_id.trim()||r.course_key!==courseKey)return null;
  return Object.freeze({actorId,courseKey,studentId:r.student_id});
 };
}
