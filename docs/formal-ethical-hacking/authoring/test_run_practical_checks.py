"""Orchestration tests use doubles/synthetic metadata; no teaching fixtures are launched."""
import copy
import json
from pathlib import Path
from types import SimpleNamespace
import subprocess
import tempfile
import unittest
import run_practical_checks as tool


class PracticalRunnerTests(unittest.TestCase):
    def setUp(self):
        self.plan = json.loads(tool.PLAN_PATH.read_text(encoding="utf-8"))
        self.checks = tool.validate_plan(self.plan)

    def test_reviewed_plan(self):
        self.assertEqual(len(self.checks), 11)
        self.assertIs(self.plan["publishable"], False)

    def test_duplicate_id(self):
        self.plan["checks"][1]["id"] = self.plan["checks"][0]["id"]
        with self.assertRaises(ValueError): tool.validate_plan(self.plan)

    def test_boolean_count(self):
        self.plan["checks"][0]["expected"]["methods"] = True
        with self.assertRaises(ValueError): tool.validate_plan(self.plan)

    def test_escape_path(self):
        self.plan["checks"][0]["fixture"] = "fixtures/../outside"
        with self.assertRaises(ValueError): tool.validate_plan(self.plan)

    def test_option_as_selector(self):
        self.plan["checks"][0]["selectors"] = ["-c"]
        with self.assertRaises(ValueError): tool.validate_plan(self.plan)

    def test_default_selection(self):
        chosen = tool.select_checks(self.checks)
        self.assertEqual(len(chosen), 6)
        self.assertTrue(all(row["effects"] == "offline" for row in chosen))

    def test_effect_gates(self):
        for label in ("arguments-reference", "loopback-http"):
            with self.subTest(label=label), self.assertRaises(ValueError):
                tool.select_checks(self.checks, [label])
        self.assertEqual(len(tool.select_checks(self.checks, shell=True, loopback=True)), 11)

    def test_unknown_profile(self):
        self.plan["checks"][0]["effects"] = "anything"
        with self.assertRaises(ValueError): tool.validate_plan(self.plan)

    def test_inconsistent_failure_exit(self):
        self.plan["checks"][0]["expected"]["failures"] = 1
        with self.assertRaises(ValueError): tool.validate_plan(self.plan)

    def test_matched_positive_and_command(self):
        with tempfile.TemporaryDirectory() as work:
            root = Path(work); (root / self.checks[0]["fixture"]).mkdir(parents=True)
            calls = []
            def child(command, **options):
                calls.append((command, options))
                return SimpleNamespace(returncode=0, stderr="Ran 20 tests in 0.01s\n\nOK\n")
            row = tool.execute(self.checks[0], root, child)
            self.assertIs(row["matched_expected_behavior"], True)
            self.assertEqual(calls[0][0][-1], "test_summary")
            self.assertEqual(calls[0][1]["cwd"], (root / self.checks[0]["fixture"]).resolve())
            self.assertNotIn("shell", calls[0][1])

    def test_matched_defect_and_unexpected_error(self):
        check = next(row for row in self.checks if row["id"] == "ownership-starter")
        with tempfile.TemporaryDirectory() as work:
            root = Path(work); (root / check["fixture"]).mkdir(parents=True)
            failure_text = "".join("FAIL: " + name + "\n" for name in check["expected"]["failure_tests"]) + "Ran 20 tests in 0.01s\nFAILED (failures=4)\n"
            failure = SimpleNamespace(returncode=1, stderr=failure_text)
            self.assertIs(tool.execute(check, root, lambda *a, **k: failure)["matched_expected_behavior"], True)
            wrong_name = SimpleNamespace(returncode=1, stderr=failure_text.replace(check["expected"]["failure_tests"][0], "test_unrelated", 1))
            self.assertIs(tool.execute(check, root, lambda *a, **k: wrong_name)["matched_expected_behavior"], False)
            error = SimpleNamespace(returncode=1, stderr="ERROR: import\nRan 1 test in 0.01s\nFAILED (errors=1)\n")
            self.assertIs(tool.execute(check, root, lambda *a, **k: error)["matched_expected_behavior"], False)

    def test_zero_skipped_expected_failure_rejected(self):
        with tempfile.TemporaryDirectory() as work:
            root = Path(work); (root / self.checks[0]["fixture"]).mkdir(parents=True)
            for text in ("Ran 0 tests in 0.01s\nOK\n", "Ran 20 tests in 0.01s\nOK (skipped=1)\n", "Ran 20 tests in 0.01s\nOK (expected failures=1)\n"):
                with self.subTest(summary=text):
                    result = SimpleNamespace(returncode=0, stderr=text)
                    self.assertIs(tool.execute(self.checks[0], root, lambda *a, **k: result)["matched_expected_behavior"], False)

    def test_missing_directory_no_launch(self):
        with tempfile.TemporaryDirectory() as work:
            def child(*args, **kwargs): self.fail("Must not launch")
            self.assertIs(tool.execute(self.checks[0], Path(work), child)["matched_expected_behavior"], False)

    def test_timeout(self):
        with tempfile.TemporaryDirectory() as work:
            root = Path(work); (root / self.checks[0]["fixture"]).mkdir(parents=True)
            def child(*args, **kwargs): raise subprocess.TimeoutExpired("fictional", 45)
            row = tool.execute(self.checks[0], root, child)
            self.assertIs(row["matched_expected_behavior"], False)
            self.assertEqual(row["blocked"], "launch-or-timeout")


if __name__ == "__main__":
    unittest.main()
