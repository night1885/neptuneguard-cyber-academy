import re

FILES = {
    'migration': 'test-certification-manual-review-postgres.mjs',
    'native': 'test-certification-manual-review-native-postgres.mjs',
}
FAILURES = {
    'testCodeFailure': 'test_code_failure',
    'uncaughtException': 'uncaught_exception',
    'unhandledRejection': 'unhandled_rejection',
    'testTimeoutFailure': 'test_timeout',
    'cancelledByParent': 'cancelled_by_parent',
    'subtestsFailed': 'subtests_failed',
    'testAborted': 'test_aborted',
    'hookFailed': 'hook_failed',
}
SYMPTOMS = (
    ('administrator_termination', ('terminating connection due to administrator command',)),
    ('connection_refused', ('ECONNREFUSED',)),
    ('connection_lost', ('Connection terminated unexpectedly',)),
    ('connection_timeout', ('timeout exceeded when trying to connect', 'Connection terminated due to connection timeout')),
    ('statement_timeout', ('canceling statement due to statement timeout',)),
    ('lock_timeout', ('canceling statement due to lock timeout',)),
    ('assertion', ('ERR_ASSERTION',)),
)

def classify(stage, filename, text):
    if stage not in FILES or filename != FILES[stage] or not isinstance(text, str):
        raise ValueError('Invalid manual-review diagnostic input')
    text = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', text[:262144])
    locations = [int(n) for n in re.findall(re.escape(filename) + r':([0-9]{1,5})(?::[0-9]{1,5})?', text)]
    parent = re.search(r'(?m)^\s*location:[^\n]*' + re.escape(filename) + r':([0-9]{1,5})(?::[0-9]{1,5})?', text)
    parent_line = int(parent.group(1)) if parent else 0
    line = next((n for n in locations if n != parent_line), parent_line)
    codes = re.findall(r"\bcode:\s*['\"]([A-Z0-9_]{1,40})['\"]", text)
    code = next((c for c in codes if re.fullmatch(r'[0-9A-Z]{5}', c)), None)
    if code is None:
        code = next((c for c in codes if c in {'ERR_ASSERTION', 'ERR_MODULE_NOT_FOUND'}), 'ERR_TEST_FAILURE' if 'ERR_TEST_FAILURE' in codes else 'unknown')
    types = re.findall(r"\bfailureType:\s*['\"]([A-Za-z]{1,40})['\"]", text)
    failure = next((FAILURES[t] for t in types if t in FAILURES), 'unclassified')
    symptom = next((name for name, markers in SYMPTOMS if any(m in text for m in markers)), 'unclassified')
    context = f'pg16_{stage}_L{line}_{code}_{failure}_{symptom}'
    if not re.fullmatch(r'pg16_[A-Za-z0-9_]{1,180}', context):
        raise ValueError('Invalid bounded manual-review context')
    return context
