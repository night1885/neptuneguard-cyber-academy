"""Selected unittest-output contracts; no teaching helper or network activity."""
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
import run_practical_checks as tool


def synthetic_check():
    return {"id": "synthetic-parent", "fixture": "fixtures/synthetic",
            "selectors": ["test_synthetic"], "effects": "offline",
            "expected": {"exit": 1, "methods": 2, "failures": 1, "errors": 0,
                         "skipped": 0, "failure_tests": ["test_outer"]}}


class OutputObserverTests(unittest.TestCase):
    def observe(self, text, code=0):
        return tool.observe(SimpleNamespace(returncode=code, stderr=text))

    def test_plain_success(self):
        self.assertEqual(self.observe("Ran 20 tests in 0.01s\n\nOK\n"),
            {"exit": 0, "methods": 20, "failures": 0, "failure_tests": [], "errors": 0,
             "skipped": 0, "expected_failures": 0, "unexpected_successes": 0})

    def test_nested_summary_does_not_replace_outer_count(self):
        text = "FAIL: test_outer\nAssertionError: nested result\nRan 17 tests in 0.01s\nOK\nRan 2 tests in 0.02s\nFAILED (failures=1)\n"
        result = self.observe(text, 1)
        self.assertEqual((result["methods"], result["failures"], result["failure_tests"]), (2, 1, ["test_outer"]))

    def test_outer_headers_can_precede_a_quoted_child_summary(self):
        text = "FAIL: test_a\nFAIL: test_b\nRan 99 tests in 0.01s\nOK\nRan 4 tests in 0.02s\nFAILED (failures=2)\n"
        result = self.observe(text, 1)
        self.assertEqual(result["methods"], 4)
        self.assertEqual(result["failure_tests"], ["test_a", "test_b"])

    def test_quoted_failure_header_is_ambiguous_not_an_extra_outer_failure(self):
        text = "FAIL: test_outer\nquoted diagnostic\nFAIL: test_child\nRan 17 tests in 0.01s\nFAILED (failures=1)\nRan 2 tests in 0.02s\nFAILED (failures=1)\n"
        result = self.observe(text, 1)
        self.assertEqual((result["methods"], result["failures"]), (2, 1))
        self.assertIsNone(result["failure_tests"])

    def test_quoted_error_header_cannot_be_accepted_as_clean(self):
        result = self.observe("ERROR: quoted-child\nRan 1 test in 0.01s\nOK\n")
        self.assertIsNone(result["errors"])

    def test_only_final_skip_count_is_reported(self):
        result = self.observe("Ran 8 tests in 0.01s\nOK (skipped=4)\nRan 20 tests in 0.02s\nOK\n")
        self.assertEqual((result["methods"], result["skipped"]), (20, 0))

    def test_terminal_expected_failure_and_unexpected_success_counts(self):
        expected = self.observe("Ran 1 test in 0.01s\nOK (expected failures=1)\n")
        unexpected = self.observe("Ran 1 test in 0.01s\nFAILED (unexpected successes=1)\n", 1)
        self.assertEqual(expected["expected_failures"], 1)
        self.assertEqual(unexpected["unexpected_successes"], 1)

    def test_missing_or_malformed_terminal_outcome_stays_unknown(self):
        texts = ("", "Ran 20 tests in 0.01s\n", "Ran 20 tests in 0.01s\nOK\ntrailing text\n",
                 "Ran 20 tests in 0.01s\nOK (unreviewed=0)\n",
                 "Ran 20 tests in 0.01s\nOK (skipped=0, skipped=0)\n",
                 "Ran 20 tests in 0.01s\nFAILED\n",
                 "Ran 20 tests in 0.01s\nOK (failures=1)\n")
        for text in texts:
            with self.subTest(text=text):
                self.assertIsNone(self.observe(text)["failures"])

    def test_final_counts_are_not_summed_across_child_and_parent(self):
        result = self.observe("Ran 99 tests in 0.01s\nOK\nRan 20 tests in 0.02s\nOK\n")
        self.assertEqual(result["methods"], 20)

    def test_execute_can_match_an_outer_failure_after_a_nested_summary(self):
        check = synthetic_check()
        text = "FAIL: test_outer\nRan 17 tests in 0.01s\nOK\nRan 2 tests in 0.02s\nFAILED (failures=1)\n"
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            (root / check["fixture"]).mkdir(parents=True)
            row = tool.execute(check, root, lambda *a, **k: SimpleNamespace(returncode=1, stderr=text))
        self.assertIs(row["matched_expected_behavior"], True)

    def test_execute_rejects_ambiguous_failure_names(self):
        check = synthetic_check()
        text = "FAIL: test_outer\nFAIL: test_child\nRan 17 tests in 0.01s\nFAILED (failures=1)\nRan 2 tests in 0.02s\nFAILED (failures=1)\n"
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            (root / check["fixture"]).mkdir(parents=True)
            row = tool.execute(check, root, lambda *a, **k: SimpleNamespace(returncode=1, stderr=text))
        self.assertIs(row["matched_expected_behavior"], False)
        self.assertIsNone(row["observed"]["failure_tests"])

    def test_actual_unittest_parent_failure_with_quoted_summary(self):
        check = synthetic_check()
        program = (
            "import unittest\nclass SyntheticTests(unittest.TestCase):\n"
            "    def test_control(self):\n        self.assertTrue(True)\n"
            "    def test_outer(self):\n        self.fail('Quoted child result\\nRan 17 tests in 0.01s\\nOK')\n"
        )
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            folder = root / check["fixture"]
            folder.mkdir(parents=True)
            (folder / "test_synthetic.py").write_text(program, encoding="utf-8")
            row = tool.execute(check, root)
        self.assertIs(row["matched_expected_behavior"], True)
        self.assertEqual(row["observed"]["methods"], 2)
        self.assertEqual(row["observed"]["failure_tests"], ["test_outer"])


if __name__ == "__main__":
    unittest.main()
