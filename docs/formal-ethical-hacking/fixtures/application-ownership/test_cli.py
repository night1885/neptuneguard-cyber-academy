"""Direct CLI contracts; no listener, client connection or authentication is implemented."""
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
            return subprocess.run([sys.executable, "-B", str(ROOT / script), *arguments],
                                  cwd=work, capture_output=True, text=True, timeout=10)

    def test_demo_reports(self):
        for script, status, met in [("application_lab.py", 1, False), ("application_repaired.py", 0, True)]:
            with self.subTest(script=script):
                result = self.run_cli(script)
                self.assertEqual(result.returncode, status)
                self.assertEqual(result.stderr, "")
                self.assertTrue(result.stdout, "Expected JSON report")
                report = json.loads(result.stdout)
                self.assertIs(report["synthetic"], True)
                self.assertIs(report["boundary_met"], met)
                self.assertEqual(len(report["cases"]), 3)
                self.assertNotIn("FICTIONAL B PRIVATE", result.stdout)

    def test_extra_arguments(self):
        for script in ("application_lab.py", "application_repaired.py"):
            with self.subTest(script=script):
                result = self.run_cli(script, "extra")
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertEqual(result.stderr.strip(), "No arguments accepted")


if __name__ == "__main__":
    unittest.main()
