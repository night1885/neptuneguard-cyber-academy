export function createFormalReviewStartupAttachment(options={}){
 if(options.enabled===true)throw Error('Persistent learner review is not permitted');
 return undefined;
}
