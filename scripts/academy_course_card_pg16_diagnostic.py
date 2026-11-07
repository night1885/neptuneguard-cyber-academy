import os
import re
import subprocess
import tempfile
from pathlib import Path

FILE = 'test-certification-manual-review-postgres.mjs'

def context(status, output='', timed_out=False):
    if timed_out:
        return 'FAIL_TIMEOUT'
    if status == 0:
        return 'PASS'
    lines = list(dict.fromkeys(re.findall(re.escape(FILE) + r':([0-9]{1,5})(?::[0-9]{1,5})?', output)))[:6]
    codes = re.findall(r"\bcode:\s*['\"]([A-Z0-9_]{1,40})['\"]", output)
    allowed = ['ERR_ASSERTION', 'ERR_MODULE_NOT_FOUND', 'ERR_TEST_FAILURE']
    code = next((item for item in allowed if item in codes), None)
    if code is None:
        code = next((item for item in codes if re.fullmatch(r'[0-9A-Z]{5}', item)), 'UNKNOWN')
    operators = re.findall(r"\boperator:\s*['\"]([A-Za-z]+)['\"]", output)
    operator = next((item for item in operators if item in ['strictEqual', 'deepStrictEqual', 'notStrictEqual', 'match', 'ok', 'rejects']), 'unknown')
    value = 'FAIL_L' + ('_'.join(lines) or '0') + '_' + code + '_' + operator
    if not re.fullmatch(r'[A-Za-z0-9_]{1,180}', value):
        raise ValueError('Unbounded diagnostic context')
    return value

def main():
    if any(os.environ.get(key) for key in ['DISCORD_TOKEN', 'DATABASE_URL', 'CERTIFICATION_DATABASE_URL']):
        raise RuntimeError('Live connection variables must be empty')
    results = {}
    for name, port in [('baseline', 15432), ('candidate', 15433)]:
        directory = Path(name).resolve()
        if not (directory / FILE).is_file():
            raise RuntimeError('Expected disposable checkout is missing')
        env = dict(os.environ, CERTIFICATION_TEST_DATABASE_URL=f'postgresql://manual_review_ci:disposable_ci_fixture_only@127.0.0.1:{port}/certification_test', CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DDL='true', CERTIFICATION_ENABLED='false')
        with tempfile.TemporaryFile() as output:
            try:
                result = subprocess.run(['node', '--test', FILE], cwd=directory, env=env, stdout=output, stderr=subprocess.STDOUT, timeout=120)
                output.seek(0)
                results[name] = context(result.returncode, output.read(262144).decode('utf-8', errors='replace'))
            except subprocess.TimeoutExpired:
                results[name] = context(1, timed_out=True)
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
        for name, value in results.items():
            output.write(name + '=' + value + '\n')
    for name, value in results.items():
        print(name + ': ' + value)
    return 0 if all(value == 'PASS' for value in results.values()) else 1

if __name__ == '__main__':
    raise SystemExit(main())
