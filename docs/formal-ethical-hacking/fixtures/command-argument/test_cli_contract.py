"""Selected subprocess contracts for the fixed-input POSIX teaching CLIs."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent


class CliContractTests(unittest.TestCase):
    def run_script(self, filename, *arguments):
        with tempfile.TemporaryDirectory(prefix="ng-cli-check-") as work:
            return subprocess.run([sys.executable, "-B", str(ROOT / filename), *arguments],
                                  cwd=work, capture_output=True, text=True, timeout=15)

    def test_report_contracts(self):
        for filename, expected_exit, violations, marker in [
            ("argument_lab.py", 1, 2, True),
            ("argument_lab_repaired.py", 0, 0, False),
        ]:
            with self.subTest(script=filename):
                result = self.run_script(filename)
                self.assertEqual(result.returncode, expected_exit)
                self.assertEqual(result.stderr, "")
                self.assertTrue(result.stdout, "Expected a JSON report, not a silent successful process")
                report = json.loads(result.stdout)
                self.assertIs(report["synthetic"], True)
                self.assertEqual(report["boundary_violations"], violations)
                self.assertEqual(len(report["cases"]), 3)
                self.assertIs(report["cases"][2]["marker_created"], marker)
                if filename == "argument_lab_repaired.py":
                    self.assertTrue(all(row["label_preserved"] and row["child_exit"] == 0
                                        and not row["marker_created"] for row in report["cases"]))

    def test_extra_arguments(self):
        for filename in ("argument_lab.py", "argument_lab_repaired.py"):
            with self.subTest(script=filename):
                result = self.run_script(filename, "extra")
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertEqual(result.stderr.strip(), "No arguments accepted")

    def test_reference_import_is_quiet(self):
        result = subprocess.run([sys.executable, "-B", "-c", "import argument_lab_repaired"],
                                cwd=ROOT, capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "")


if __name__ == "__main__":
    unittest.main()
