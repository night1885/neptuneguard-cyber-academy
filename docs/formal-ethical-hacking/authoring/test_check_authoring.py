import contextlib
import io
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from check_authoring import DOCUMENTS, TESTS, check_documents, run_checks


class AuthoringTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.root = Path(self.work.name)
        (self.root / "authoring").mkdir()
        for name in DOCUMENTS:
            (self.root / name).write_text("# Draft\n", encoding="utf-8")

    def write(self, text):
        (self.root / DOCUMENTS[0]).write_text(text, encoding="utf-8")

    def run_quiet(self, runner):
        with contextlib.redirect_stdout(io.StringIO()):
            return run_checks(self.root, runner)

    def test_valid_parent_link(self):
        (self.root / DOCUMENTS[2]).write_text("[start](../START-HERE.md)", encoding="utf-8")
        self.assertEqual(check_documents(self.root), [])

    def test_missing_target(self):
        self.write("[missing](absent.md)")
        self.assertTrue(check_documents(self.root))

    def test_encoded_escape(self):
        self.write("[escape](%2e%2e/outside.md)")
        self.assertTrue(check_documents(self.root))

    def test_absolute_target(self):
        self.write("[absolute](/outside.md)")
        self.assertTrue(check_documents(self.root))

    def test_external_and_fragment_skipped(self):
        self.write("[web](https://example.invalid/page) [section](#heading)")
        self.assertEqual(check_documents(self.root), [])

    def test_missing_required_document(self):
        (self.root / DOCUMENTS[1]).unlink()
        self.assertTrue(check_documents(self.root))

    def test_allowlist_and_success(self):
        calls = []
        def runner(command, **kwargs):
            calls.append((command, kwargs))
            return SimpleNamespace(returncode=0)
        self.assertEqual(self.run_quiet(runner), 0)
        self.assertEqual(len(calls), 3)
        self.assertEqual(calls[-1][0][5:], list(TESTS))
        self.assertNotIn("discover", calls[-1][0])
        self.assertTrue(all(kwargs["cwd"] == self.root / "authoring" for _, kwargs in calls))

    def test_child_failure(self):
        self.assertEqual(self.run_quiet(lambda *a, **k: SimpleNamespace(returncode=7)), 1)

    def test_timeout(self):
        def runner(command, **kwargs):
            raise subprocess.TimeoutExpired(command, kwargs["timeout"])
        self.assertEqual(self.run_quiet(runner), 1)

    def test_launch_error(self):
        def runner(*args, **kwargs):
            raise OSError("synthetic launch failure")
        self.assertEqual(self.run_quiet(runner), 1)

    def test_link_failure_not_masked_by_children(self):
        self.write("[missing](absent.md)")
        self.assertEqual(self.run_quiet(lambda *a, **k: SimpleNamespace(returncode=0)), 1)


if __name__ == "__main__":
    unittest.main()
