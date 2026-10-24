"""Selected same-identity helper selection checks; no privilege escalation."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import search_lab as lab
import search_repaired


class BoundaryRequirements:
    def setUp(self):
        self.work = tempfile.TemporaryDirectory(prefix="ng search test ")
        self.addCleanup(self.work.cleanup)
        self.root = Path(self.work.name)
        lab.prepare_layout(self.root)

    def test_trusted_first(self):
        self.assertEqual(self.probe(self.root, False).stdout, lab.EXPECTED)

    def test_untrusted_first(self):
        self.assertEqual(self.probe(self.root, True).stdout, lab.EXPECTED)

    def test_space_in_workspace(self):
        self.assertIn(" ", str(self.root))
        self.assertEqual(self.probe(self.root, False).stdout, lab.EXPECTED)

    def test_child_status_not_selection(self):
        self.assertEqual(self.probe(self.root, True).returncode, 0)

    def test_changed_source_no_launch(self):
        (self.root / "trusted" / lab.HELPER).write_text("# changed", encoding="utf-8")
        with patch("search_lab.launch") as runner:
            with self.assertRaises(ValueError):
                self.probe(self.root, False)
            runner.assert_not_called()

    def test_extra_entry_no_launch(self):
        (self.root / "unexpected").write_text("FICTIONAL", encoding="utf-8")
        with patch("search_lab.launch") as runner:
            with self.assertRaises(ValueError):
                self.probe(self.root, False)
            runner.assert_not_called()

    def test_symlink_no_launch(self):
        helper = self.root / "trusted" / lab.HELPER
        helper.unlink()
        helper.symlink_to(self.root / "untrusted" / lab.HELPER)
        with patch("search_lab.launch") as runner:
            with self.assertRaises(ValueError):
                self.probe(self.root, False)
            runner.assert_not_called()

    def test_mode_no_launch(self):
        (self.root / "trusted" / lab.HELPER).chmod(0o600)
        with patch("search_lab.launch") as runner:
            with self.assertRaises(ValueError):
                self.probe(self.root, False)
            runner.assert_not_called()

    def test_order_type_no_launch(self):
        with patch("search_lab.launch") as runner:
            with self.assertRaises(ValueError):
                self.probe(self.root, "yes")
            runner.assert_not_called()

    def test_parent_path_unchanged(self):
        before = os.environ.get("PATH")
        self.probe(self.root, True)
        self.assertEqual(os.environ.get("PATH"), before)

    def test_prepare_refuses_nonempty(self):
        with self.assertRaises(ValueError):
            lab.prepare_layout(self.root)

    def test_runtime_no_launch(self):
        with patch("search_lab.os.name", "nt"), patch("search_lab.launch") as runner:
            with self.assertRaises(RuntimeError):
                self.probe(self.root, False)
            runner.assert_not_called()


class StarterTests(BoundaryRequirements, unittest.TestCase):
    probe = staticmethod(lab.run_probe)


class ReferenceTests(BoundaryRequirements, unittest.TestCase):
    probe = staticmethod(search_repaired.run_probe)


class CliTests(unittest.TestCase):
    def run_cli(self, script, *arguments):
        root = Path(__file__).resolve().parent
        with tempfile.TemporaryDirectory() as work:
            return subprocess.run([sys.executable, "-B", str(root / script), *arguments], cwd=work,
                                  capture_output=True, text=True, timeout=10)

    def test_reports(self):
        for script, code, trusted in (("search_lab.py", 1, False), ("search_repaired.py", 0, True)):
            with self.subTest(script=script):
                result = self.run_cli(script)
                self.assertEqual(result.returncode, code)
                self.assertEqual(result.stderr, "")
                self.assertTrue(result.stdout, "Expected JSON report")
                report = json.loads(result.stdout)
                self.assertIs(report["synthetic"], True)
                self.assertIs(report["all_trusted"], trusted)
                self.assertEqual(len(report["cases"]), 2)
                self.assertIs(report["cases"][0]["trusted_selected"], True)
                self.assertIs(report["cases"][1]["trusted_selected"], trusted)
                self.assertIs(report["cases"][1]["other_fixed_helper_selected"], not trusted)
                self.assertTrue(all(row["child_exit"] == 0 for row in report["cases"]))

    def test_arguments(self):
        for script in ("search_lab.py", "search_repaired.py"):
            with self.subTest(script=script):
                result = self.run_cli(script, "extra")
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertEqual(result.stderr.strip(), "No arguments accepted")


if __name__ == "__main__":
    unittest.main()
