import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseManualReviewConstraint as parse, validateManualReviewReadiness } from './certification-manual-review-readiness.mjs';
import { validateActiveEnrollmentAgreement } from './certification-schema-readiness.js';
const sql=await readFile(new URL('./migrations/010-manual-review-enrollment.sql',import.meta.url),'utf8');
const snapshot=/ADD CONSTRAINT certification_manual_review_snapshot_complete (CHECK \([\s\S]*?)\);/.exec(sql)[1]+')';
const acknowledgment=/ADD CONSTRAINT certification_account_acknowledgment_required (CHECK \([\s\S]*?)\);/.exec(sql)[1]+')';
const good={restricted_role:true,table_shape:true,owner_limits:true,columns_ok:true,column_privileges:true,constraints_ok:true,function_dependencies:true,function_shape:true,
  function_body:/AS \$function\$([\s\S]*?)\$function\$/.exec(sql)[1],function_settings:['search_path=pg_catalog'],snapshot_constraint:snapshot,acknowledgment_constraint:acknowledgment};
const pool=row=>({async query(){return{rows:[row]};}});
test('accepts reviewed metadata and constraints',async()=>assert.deepEqual(await validateManualReviewReadiness(pool(good)),{ready:true}));
for(const key of ['restricted_role','table_shape','owner_limits','columns_ok','column_privileges','constraints_ok','function_dependencies','function_shape'])test(`fails closed on ${key}`,async()=>assert.rejects(validateManualReviewReadiness(pool({...good,[key]:false})),/readiness failed/));
for(const patch of [{function_body:'SELECT true'},{function_settings:null},{snapshot_constraint:'CHECK (true)'},{acknowledgment_constraint:acknowledgment.replace('age_eligible IS TRUE','age_eligible IS NOT TRUE')},
  {snapshot_constraint:snapshot.replace('comprehension_passed_at IS NULL','comprehension_passed_at IS NOT NULL')}])test('rejects altered safeguard metadata',async()=>assert.rejects(validateManualReviewReadiness(pool({...good,...patch})),/readiness failed/));
test('parser preserves boolean grouping',()=>assert.notDeepEqual(parse("CHECK ((a IS NULL OR b IS NULL) AND c IS NULL)"),parse("CHECK (a IS NULL OR (b IS NULL AND c IS NULL))")));
test('parser normalizes PostgreSQL text casts and BETWEEN expansion',()=>assert.deepEqual(parse("CHECK (char_length(agreement_version) BETWEEN 1 AND 100 AND status = 'pending')"),parse("CHECK ((char_length(agreement_version) >= 1 AND char_length(agreement_version) <= 100) AND status = 'pending'::text)")));
test('parser rejects trailing SQL and unreviewed functions',()=>{assert.throws(()=>parse('CHECK (a IS NULL); SELECT true'));assert.throws(()=>parse('CHECK (other_function(a))'));});
test('manual-review flag off avoids new metadata queries',async()=>{let queries=0;await validateActiveEnrollmentAgreement({async query(){queries++;throw new Error();}},{});assert.equal(queries,0);});
test('manual-review flag on enforces readiness before agreement lookup',async()=>{let queries=0;await assert.rejects(validateActiveEnrollmentAgreement({async query(){queries++;return{rows:[]};}},{manualReviewEnabled:true,activeAgreementVersion:'v1'}),/readiness failed/);assert.equal(queries,1);});
test('manual-review readiness does not bypass agreement content validation',async()=>{const content='Fixture agreement',hash=createHash('sha256').update(content).digest('hex');let queries=0;const db={async query(){queries++;return{rows:[queries===1?good:{content,content_sha256:hash}]};}};await validateActiveEnrollmentAgreement(db,{manualReviewEnabled:true,activeAgreementVersion:'v1',activeAgreementSha256:hash});assert.equal(queries,2);});
test('parser rejects type-changing snapshot casts',()=>assert.throws(()=>parse("CHECK ((comprehension_review_snapshot::text ->> 'checkVersion') = comprehension_check_version)")));
