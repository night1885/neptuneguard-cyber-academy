"""Maintainer-only selected regression orchestration; no teaching-source edits."""
import copy
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ORIGIN = Path(__file__).resolve().parent
SOURCE_NAME = "summarize_observations.py"
MODULES = ("test_summary", "test_summary_additional", "test_summary_decoding")
COPY_FILES = (SOURCE_NAME, "observations.json", *(name + ".py" for name in MODULES))
ANCHOR = ", object_pairs_hook=_unique_object"
EXPECTED_FAILURES = (
    "test_summary_decoding.CliDecodingTests.test_duplicate_cli_has_fixed_non_echoing_failure",
    "test_summary_decoding.DecodingTests.test_conflicting_root_member",
    "test_summary_decoding.DecodingTests.test_equal_root_member",
    "test_summary_decoding.DecodingTests.test_repeated_records_member",
    "test_summary_decoding.DecodingTests.test_conflicting_record_method",
    "test_summary_decoding.DecodingTests.test_equal_record_status",
    "test_summary_decoding.DecodingTests.test_escaped_member_name_collision",
    "test_summary_decoding.DecodingTests.test_conflicting_record_id_member",
    "test_summary_decoding.DecodingTests.test_duplicate_detected_before_shape_validation",
)
CHILD_CODE = """
import io
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path.cwd()))
suite = unittest.defaultTestLoader.loadTestsFromNames(sys.argv[1:])
loaded = suite.countTestCases()
diagnostic = io.StringIO()
result = unittest.TextTestRunner(stream=diagnostic, verbosity=0).run(suite)
print(json.dumps({
    'loaded': loaded, 'run': result.testsRun,
    'failures': [test.id() for test, _ in result.failures],
    'errors': [test.id() for test, _ in result.errors],
    'skipped': [test.id() for test, _ in result.skipped],
    'expected_failures': [test.id() for test, _ in result.expectedFailures],
    'unexpected_successes': [test.id() for test in result.unexpectedSuccesses],
    'success': result.wasSuccessful(), 'diagnostic': diagnostic.getvalue()
}))
"""


def _without_member_hook(source):
    if source.count(ANCHOR) != 1:
        raise ValueError("Expected exactly one reviewed hook call")
    return source.replace(ANCHOR, "", 1)


def _run_named(root, modules):
    if (not isinstance(modules, tuple) or not modules
            or len(set(modules)) != len(modules)
            or any(name not in MODULES for name in modules)):
        raise ValueError("Use only reviewed child modules")
    completed = subprocess.run(
        [sys.executable, "-I", "-B", "-c", CHILD_CODE, *modules],
        cwd=root, shell=False, capture_output=True, text=True, timeout=20)
    if completed.returncode != 0 or completed.stderr:
        raise AssertionError("Reviewed unittest child did not complete cleanly: " + completed.stderr)
    return json.loads(completed.stdout)


class RegressionHarnessTests(unittest.TestCase):
    def assert_report(self, report, failures=()):
        diagnostic = report.get("diagnostic", "")
        self.assertGreater(report["run"], 0, diagnostic)
        self.assertEqual(report["run"], report["loaded"], diagnostic)
        for field in ("errors", "skipped", "expected_failures", "unexpected_successes"):
            self.assertEqual(report[field], [], diagnostic)
        self.assertEqual(sorted(report["failures"]), sorted(failures), diagnostic)
        self.assertIs(report["success"], not bool(failures), diagnostic)

    def test_selected_hook_regression_and_restoration(self):
        originals = {name: (ORIGIN / name).read_bytes() for name in COPY_FILES}
        original_source = originals[SOURCE_NAME].decode("utf-8")
        mutated_source = _without_member_hook(original_source)
        with tempfile.TemporaryDirectory(prefix="ng-summary-regression-") as work:
            root = Path(work)
            for name, raw in originals.items():
                (root / name).write_bytes(raw)
            baseline = _run_named(root, MODULES)
            self.assert_report(baseline)
            try:
                (root / SOURCE_NAME).write_bytes(mutated_source.encode("utf-8"))
                mutated = _run_named(root, ("test_summary_decoding",))
            finally:
                (root / SOURCE_NAME).write_bytes(originals[SOURCE_NAME])
            restored = _run_named(root, MODULES)
            self.assert_report(restored)
            for name, raw in originals.items():
                self.assertEqual((root / name).read_bytes(), raw)
            self.assert_report(mutated, EXPECTED_FAILURES)
        for name, raw in originals.items():
            self.assertEqual((ORIGIN / name).read_bytes(), raw)
        print(json.dumps({"selected_regression_phases": [
            {"phase": label, "methods": report["run"], "failure_events": len(report["failures"])}
            for label, report in (("baseline", baseline), ("hook-removed", mutated), ("restored", restored))
        ]}), flush=True)

    def test_mutation_requires_single_anchor(self):
        for text in ("no hook", ANCHOR + ANCHOR):
            with self.subTest(text=text):
                with self.assertRaisesRegex(ValueError, "^Expected exactly one reviewed hook call$"):
                    _without_member_hook(text)
        self.assertEqual(_without_member_hook("before" + ANCHOR + "after"), "beforeafter")

    def test_report_rejects_empty_or_incomplete_execution(self):
        clean = {"loaded": 1, "run": 1, "failures": [], "errors": [], "skipped": [],
                 "expected_failures": [], "unexpected_successes": [], "success": True, "diagnostic": ""}
        self.assert_report(clean)
        changes = ({"loaded": 0, "run": 0}, {"run": 0}, {"errors": ["synthetic-import-error"]},
                   {"skipped": ["synthetic-skip"]}, {"expected_failures": ["synthetic-xfail"]},
                   {"unexpected_successes": ["synthetic-xpass"]}, {"failures": ["unexpected"]},
                   {"success": False})
        for change in changes:
            with self.subTest(change=change):
                report = copy.deepcopy(clean)
                report.update(change)
                with self.assertRaises(AssertionError):
                    self.assert_report(report)

    def test_child_selection_excludes_harness_and_unknown_modules(self):
        selections = (("test_summary_regression",), ("unreviewed",), (),
                      ("test_summary", "test_summary"), "test_summary")
        with patch.object(subprocess, "run", side_effect=AssertionError("Child must not launch")) as launch:
            for modules in selections:
                with self.subTest(modules=modules):
                    with self.assertRaisesRegex(ValueError, "^Use only reviewed child modules$"):
                        _run_named(ORIGIN, modules)
            launch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
