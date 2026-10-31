import {readFile} from 'node:fs/promises';
import {inspectFictionalIntakeStagingProfile} from './fictional-intake-staging-profile.mjs';
import {createStagingPilot} from './staging-pilot.mjs';
let stage='manifest-read',pilot;
const report=label=>console.log('Staging diagnostic: '+label);
try {
 const text=await readFile(process.argv[2]??'/etc/secrets/staging-manifest.json','utf8');
 stage='manifest-json';
 const manifest=JSON.parse(text);
 stage='profile-validation';
 const inspected=inspectFictionalIntakeStagingProfile(manifest.profile??{});
 if(!inspected.ok)throw Error();
 if(!inspected.enabled){report('manifest-disabled');}
 else if(process.env.FICTIONAL_STAGE_RUN!=='true'){report('run-flag-disabled');}
 else {
  stage='credential-presence';
  if(!process.env.FICTIONAL_STAGE_TOKEN||!process.env.FICTIONAL_STAGE_DB_PASSWORD)throw Error();
  report('credentials-present-not-validated');
  stage='pilot-construction';
  pilot=createStagingPilot(manifest);
  stage='live-startup';
  if(await pilot.start()!==true)throw Error();
  report('started-operational-readiness-not-certified');
 }
} catch {
 console.error('Staging diagnostic: failed-at-'+stage);
 process.exitCode=1;
}
for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{void pilot?.stop().catch(()=>{console.error('Staging diagnostic: cleanup-attention');process.exitCode=1;});});
