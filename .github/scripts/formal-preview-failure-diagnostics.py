import glob
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

BASE = 'a707a6740949eef3ab4da605a4bb6ab73a3ebd82'
HEAD = '819aaf8394fffd6a6e28b4bef24692050de2917b'
LIMIT = 2097152


def context(text, code, allowed):
    if code == 0:
        skips = re.findall(r'(?m)^# skipped ([0-9]{1,6})$', text)
        return 'pass_skips' + (skips[-1] if skips else 'unknown')
    failures = list(re.finditer(r'(?m)^\s*not ok [0-9]+ - [^\n]*', text))
    locations = []
    for index, match in enumerate(failures[:3]):
        end = failures[index + 1].start() if index + 1 < len(failures) else len(text)
        block = text[match.start():end]
        stack = block.partition('stack:')[2]
        pattern = r'(test-certification-[a-z0-9_-]{1,110}\.mjs):([0-9]{1,6})(?::[0-9]{1,6})?'
        candidates = re.findall(pattern, stack) or re.findall(pattern, block)
        point = next(((name, line) for name, line in candidates if name in allowed), None)
        if point is None:
            locations.append('unlocated')
            continue
        found = re.search(r"(?m)^\s*code:\s*['\"]?([A-Z0-9_]{1,40})", block)
        error = found.group(1) if found else 'unknown'
        if not re.fullmatch(r'[0-9A-Z]{5}|ERR_ASSERTION|ERR_MODULE_NOT_FOUND|ERR_TEST_FAILURE', error):
            error = 'unknown'
        operator = re.search(r"(?m)^\s*operator:\s*['\"]?([A-Za-z]+)", block)
        op = operator.group(1) if operator else ''
        if op not in {'strictEqual', 'deepStrictEqual', 'match', 'doesNotMatch', 'rejects', 'throws', 'ok', 'fail'}:
            op = ''
        locations.append(f'{point[0]}_L{point[1]}_{error}' + ('_' + op if op else ''))
    value = ';'.join(locations) if locations else ('signal' + str(-code) if code < 0 else 'unlocated_exit' + str(code))
    value = value[:190]
    return value if re.fullmatch(r'[A-Za-z0-9_.;-]{1,190}', value) else 'unlocated'


def self_test():
    name = 'test-certification-fixture.mjs'
    sample = "not ok 1 - Private fixture answer MUST_NOT_APPEAR\n  location: '/runner/" + name + ":12:1'\n  code: 'ERR_ASSERTION'\n  operator: 'strictEqual'\n  stack: |-\n    TestContext.<anonymous> (/runner/" + name + ":88:9)\n"
    cases = [
        ('# skipped 0\n', 0, 'pass_skips0'),
        ('# skipped 42\n', 0, 'pass_skips42'),
        ('', 0, 'pass_skipsunknown'),
        (sample, 1, name + '_L88_ERR_ASSERTION_strictEqual'),
        (sample.replace("'ERR_ASSERTION'", "'42501'"), 1, name + '_L88_42501_strictEqual'),
        (sample.replace("'ERR_ASSERTION'", "'PRIVATE_ERROR_STRING'"), 1, name + '_L88_unknown_strictEqual'),
        ('', 1, 'unlocated_exit1'),
        ('', -9, 'signal9'),
    ]
    for text, code, expected in cases:
        result = context(text, code, {name})
        assert result == expected
        assert 'MUST_NOT_APPEAR' not in result
        assert '/runner/' not in result
    assert context(sample, 1, set()) == 'unlocated'
    assert len(context(sample * 10, 1, {name})) <= 190
    print(json.dumps({'parser_checks': len(cases) + 2, 'passed': True}))


def run_case(tree, filenames, env):
    allowed = {Path(name).name for name in filenames}
    with tempfile.TemporaryFile() as output:
        with subprocess.Popen(['node', '--test', '--test-reporter=tap', *filenames], cwd=tree,
                              env=env, stdout=output, stderr=subprocess.STDOUT,
                              start_new_session=True) as process:
            try:
                code = process.wait(timeout=120)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait(timeout=10)
                return 124, 'timeout'
        output.seek(0)
        text = output.read(LIMIT).decode('utf-8', errors='replace')
        return code, context(text, code, allowed)


def main():
    if sys.argv[1:] == ['--self-test']:
        self_test()
        return 0
    if sys.argv[1:] or os.environ.get('GITHUB_ACTIONS') != 'true':
        return 2
    root = Path.cwd().resolve()
    git = lambda *args: subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', *args], cwd=root,
                                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    for filename in ('package.json', 'package-lock.json'):
        assert git('show', BASE + ':' + filename) == git('show', HEAD + ':' + filename) == (root / filename).read_bytes()
    database = os.environ['PROBE_DATABASE_URL']
    url = urlsplit(database)
    assert url.scheme == 'postgresql' and url.hostname == '127.0.0.1' and url.port == 5432
    assert url.path == '/certification_test' and not url.query and not url.fragment
    assert url.username == 'manual_review_ci' and url.password == 'disposable_ci_fixture_only'
    common = {key: value for key, value in os.environ.items() if not key.startswith('CERTIFICATION_TEST_') and key != 'PROBE_DATABASE_URL'}
    common.update(CERTIFICATION_ENABLED='false', CERTIFICATION_DATABASE_URL='', DATABASE_URL='', DISCORD_TOKEN='')
    records = {}
    original = git('rev-parse', 'HEAD').decode('ascii').strip()

    def publish(label, result):
        records[label] = result
        code, location = result
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write(f'{label}_code={code}\n{label}_context={location}\n')
        print(json.dumps({'case': label, 'exit': code, 'context': location}))

    try:
        for label, revision in (('base', BASE), ('head', HEAD)):
            git('checkout', '--detach', revision)
            unit = sorted(glob.glob('test-certification-*.mjs', root_dir=root))
            assert unit
            publish(label + '_unit', run_case(root, unit, common))
            pg_env = {**common, 'CERTIFICATION_TEST_DATABASE_URL': database, 'CERTIFICATION_TEST_ALLOW_MANUAL_REVIEW_DDL': 'true'}
            publish(label + '_pg16', run_case(root, ['test-certification-manual-review-postgres.mjs'], pg_env))
    finally:
        git('checkout', '--detach', original)

    return int(any(value[0] != 0 for value in records.values()))


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        print('diagnostic_setup_failed')
        sys.exit(1)
