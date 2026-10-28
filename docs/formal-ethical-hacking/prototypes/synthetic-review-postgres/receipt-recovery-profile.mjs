export function requireDisposableRecoveryProfile(env){
 if(env.GITHUB_ACTIONS!=='true'||env.SYNTHETIC_REVIEW_CI!=='true'||env.DATABASE_URL||!['16','18'].includes(env.SYNTHETIC_PG_MAJOR))throw new Error('Explicit disposable recovery CI required');
 let u;try{u=new URL(env.SYNTHETIC_REVIEW_DATABASE_URL);}catch{throw new Error('Explicit disposable recovery CI required');}
 if(u.protocol!=='postgresql:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||u.pathname!=='/synthetic_review_test'||u.username!=='synthetic_review_admin'||u.password!=='ci-disposable-only'||u.search||u.hash)throw new Error('Explicit disposable recovery CI required');
 return u;
}
