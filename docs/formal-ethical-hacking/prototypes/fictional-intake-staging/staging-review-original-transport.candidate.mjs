// No implicit fetch client: tests and future activation must inject transport explicitly.
const snow=x=>typeof x==='string'&&/^[0-9]{17,20}$/.test(x);
const exact=(x,k)=>x&&Object.keys(x).sort().join(',')===k;
const fail=()=>Error('Response transport outcome unknown');
export function createOriginalResponseTransport(config={},ports={}){
 if(config.enabled!==true)return Object.freeze({defer:async()=>{throw fail();},edit:async()=>{throw fail();},remove:async()=>{throw fail();}});
 const {fetch:request}=ports,timeout=config.timeoutMs??1500;if(typeof request!=='function'||!Number.isInteger(timeout)||timeout<10||timeout>2000)throw fail();
 function scope(c){if(!snow(c?.applicationId)||!snow(c?.interactionId)||!snow(c?.channelId)||typeof c.token!=='string'||c.token.length<20||c.token.length>4096||/[\u0000-\u0020]/.test(c.token))throw fail();}
 async function call(c,method,path,body,consume){scope(c);const controller=new AbortController();let timer;const work=Promise.resolve().then(async()=>{const response=await request('https://discord.com/api/v10/'+path,{method,redirect:'error',credentials:'omit',headers:{'Content-Type':'application/json','User-Agent':'FictionalReviewCandidate/1'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});if(response.redirected===true)throw fail();return consume(response);});try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail());},timeout);})]);}catch{throw fail();}finally{clearTimeout(timer);}}
 const webhook=c=>'webhooks/'+c.applicationId+'/'+encodeURIComponent(c.token)+'/messages/@original';
 return Object.freeze({
 defer(c){return call(c,'POST','interactions/'+c.interactionId+'/'+encodeURIComponent(c.token)+'/callback',{type:5,data:{flags:64}},async r=>{if(r.status!==204)throw fail();return {acknowledged:true};});},
 edit(c,p){if(!exact(p,'allowedMentions,components,content,embeds')||!['Feedback captured. Reopen the review controls to prepare this selection.','Review input unavailable. Start a fresh selection.'].includes(p.content)||!Array.isArray(p.embeds)||p.embeds.length||!Array.isArray(p.components)||p.components.length||!exact(p.allowedMentions,'parse')||!Array.isArray(p.allowedMentions.parse)||p.allowedMentions.parse.length)return Promise.reject(fail());return call(c,'PATCH',webhook(c),{content:p.content,embeds:[],components:[],allowed_mentions:{parse:[]}},async r=>{if(r.status!==200)throw fail();const message=await r.json();if(!snow(message?.id)||message.channel_id!==c.channelId||!Number.isInteger(message.flags)||message.flags<0||(message.flags&64)!==64||message.content!==p.content)throw fail();return {acknowledged:true};});},
 remove(c){return call(c,'DELETE',webhook(c),undefined,async r=>{if(r.status===204)return {deleted:true};if(r.status===404&&(await r.json())?.code===10008)return {deleted:true};throw fail();});}
 });
}
