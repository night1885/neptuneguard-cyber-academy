import test from 'node:test';
import assert from 'node:assert/strict';
import {requireDisposableRecoveryProfile as profile} from './receipt-recovery-profile.mjs';
const valid=()=>({GITHUB_ACTIONS:'true',SYNTHETIC_REVIEW_CI:'true',SYNTHETIC_PG_MAJOR:'16',SYNTHETIC_REVIEW_DATABASE_URL:'postgresql://synthetic_review_admin:ci-disposable-only@127.0.0.1:5432/synthetic_review_test'});
test('offline: missing explicit opt-ins rejected',()=>assert.throws(()=>profile({})));
test('offline: general database URL rejected',()=>assert.throws(()=>profile({...valid(),DATABASE_URL:'postgresql://example.invalid/live'})));
test('offline: only PostgreSQL 16 and 18 accepted',()=>{for(const n of ['16','18'])assert.equal(profile({...valid(),SYNTHETIC_PG_MAJOR:n}).hostname,'127.0.0.1');for(const n of ['15','17','19',''])assert.throws(()=>profile({...valid(),SYNTHETIC_PG_MAJOR:n}));});
test('offline: incorrect CI opt-ins rejected',()=>{for(const field of ['GITHUB_ACTIONS','SYNTHETIC_REVIEW_CI'])for(const value of ['false','',undefined])assert.throws(()=>profile({...valid(),[field]:value}));});
test('offline: nonfixture connection settings rejected',()=>{for(const value of ['postgresql://synthetic_review_admin:ci-disposable-only@localhost:5432/synthetic_review_test','postgresql://synthetic_review_admin:ci-disposable-only@127.0.0.1:5433/synthetic_review_test','postgresql://synthetic_review_admin:ci-disposable-only@127.0.0.1:5432/production','postgresql://other:ci-disposable-only@127.0.0.1:5432/synthetic_review_test','postgresql://synthetic_review_admin:wrong@127.0.0.1:5432/synthetic_review_test',valid().SYNTHETIC_REVIEW_DATABASE_URL+'?sslmode=disable',valid().SYNTHETIC_REVIEW_DATABASE_URL+'#extra'])assert.throws(()=>profile({...valid(),SYNTHETIC_REVIEW_DATABASE_URL:value}));});
