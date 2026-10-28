import {appendFile} from 'node:fs/promises';
import {auditFirstJourney,renderAuditSummary,auditAnnotation} from './formal-render-audit.mjs';
try{
 const rows=await auditFirstJourney(),summary=renderAuditSummary(rows);
 for(const row of rows)console.log(auditAnnotation(row));
 console.log(summary);
 if(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary,'utf8');
}catch{console.error('Draft rendering audit could not verify bounded source integrity. No delivery acceptance is claimed.');process.exitCode=1;}
