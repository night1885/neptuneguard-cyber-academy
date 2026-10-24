"""Exact update-demo script checks from unrelated temporary directories."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent


class CliTests(unittest.TestCase):
    def run_cli(self, script, *arguments):
        with tempfile.TemporaryDirectory() as work:
            return subprocess.run([sys.executable, "-B", str(ROOT / script), *arguments], cwd=work,
                                  capture_output=True, text=True, timeout=10)

    def test_reports(self):
        for script, code, preserved, revision in [("update_lab.py", 1, False, 2), ("update_repaired.py", 0, True, 1)]:
            with self.subTest(script=script):
                result = self.run_cli(script)
                self.assertEqual(result.returncode, code)
                self.assertEqual(result.stderr, "")
                self.assertTrue(result.stdout, "Expected JSON report")
                report = json.loads(result.stdout)
                self.assertIs(report["synthetic"], True)
                self.assertIs(report["legitimate_update_succeeded"], True)
                self.assertIs(report["stale_revision_rejected"], True)
                self.assertIs(report["owner_preserved"], preserved)
                self.assertIs(report["server_field_rejected"], preserved)
                self.assertIs(report["valid_text_preserved"], preserved)
                self.assertEqual(report["final_revision"], revision)

    def test_arguments(self):
        for script in ("update_lab.py", "update_repaired.py"):
            with self.subTest(script=script):
                result = self.run_cli(script, "extra")
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertEqual(result.stderr.strip(), "No arguments accepted")


if __name__ == "__main__":
    unittest.main()
