export const REVIEW_POLICY=Object.freeze({draftMs:86400000,reportMs:86400000,maxCharacters:2000,maxBytes:8192});
export const discordId=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
export const operationId=x=>typeof x==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x);
export function boundedReviewText(x){if(typeof x!=='string'||!x.trim()||Array.from(x).length>REVIEW_POLICY.maxCharacters||Buffer.byteLength(x,'utf8')>REVIEW_POLICY.maxBytes)return false;return !Array.from(x).some(c=>{const n=c.codePointAt(0);return n>=0xd800&&n<=0xdfff;});}
export function reviewClock(x){if(!Number.isSafeInteger(x)||x<0||x>8640000000000000-REVIEW_POLICY.reportMs)throw Error('Formal review unavailable');return x;}
export function exactFields(x,fields){return Boolean(x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===[...fields].sort().join(','));}
