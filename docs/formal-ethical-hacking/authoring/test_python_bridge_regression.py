"""Run only the trusted Python-reading fixture, using disposable copies."""
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRA = """

class AdditionalReadingTests(unittest.TestCase):
    def test_nonzero_without_review_tag(self):
        run = PracticeRun("extra", 2, ())
        self.assertTrue(needs_review(run))
        self.assertEqual(summary(run), "extra: nonzero")

    def test_zero_with_different_tag(self):
        run = PracticeRun("extra", 0, ("draft",))
        self.assertTrue(needs_review(run))
        self.assertEqual(summary(run), "extra: success")
"""


class PythonBridgeRegressionTests(unittest.TestCase):
    def setUp(self):
        fixture = ROOT / "fixtures" / "python-reading"
        self.original = (fixture / "reading_model.py").read_text(encoding="utf-8")
        self.original_tests = (fixture / "test_reading_model.py").read_text(encoding="utf-8")
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)
        (self.work / "reading_model.py").write_text(self.original, encoding="utf-8")
        (self.work / "test_reading_model.py").write_text(self.original_tests, encoding="utf-8")

    def execute(self, expected_count, expected_status):
        result = subprocess.run(
            [sys.executable, "-B", "-m", "unittest", "-v", "test_reading_model"],
            cwd=self.work, capture_output=True, text=True, timeout=10,
        )
        self.assertEqual(result.returncode, expected_status, result.stdout + result.stderr)
        match = re.search(r"Ran ([0-9]+) tests?", result.stderr)
        self.assertIsNotNone(match, result.stderr)
        self.assertEqual(int(match.group(1)), expected_count, result.stderr)
        if expected_status == 0:
            self.assertIn("\nOK\n", result.stderr)
        print("fixture run: methods=%d status=%d" % (expected_count, result.returncode))
        return result

    def test_original_eight(self):
        self.execute(8, 0)

    def test_two_added_cases(self):
        (self.work / "test_reading_model.py").write_text(self.original_tests + EXTRA, encoding="utf-8")
        self.execute(10, 0)

    def test_mutation_then_restore(self):
        needle = "if status == 0:"
        self.assertEqual(self.original.count(needle), 1)
        model = self.work / "reading_model.py"
        try:
            model.write_text(self.original.replace(needle, "if status != 0:", 1), encoding="utf-8")
            result = self.execute(8, 1)
            failures = set(re.findall(r"^FAIL: ([a-z_]+) ", result.stderr, re.MULTILINE))
            self.assertEqual(failures, {"test_zero_status", "test_nonzero_status", "test_summary_success", "test_summary_nonzero"}, result.stderr)
            self.assertIn("FAILED (failures=4)", result.stderr)
        finally:
            model.write_text(self.original, encoding="utf-8")
        self.execute(8, 0)
        self.assertEqual(model.read_text(encoding="utf-8"), self.original)


if __name__ == "__main__":
    unittest.main()
