"""Synthetic CLI tests only; no teaching fixtures or child processes run."""
import contextlib
import io
import json
import unittest
from unittest.mock import patch
import run_practical_checks as tool


def plan():
    def row(label, effect):
        return {"id": label, "fixture": "fixtures/synthetic",
                "selectors": ["test_synthetic"], "effects": effect,
                "expected": {"exit": 0, "methods": 1, "failures": 0,
                             "errors": 0, "skipped": 0, "failure_tests": []}}
    return {"schemaVersion": 1, "status": "draft-maintainer-only",
            "runtimeIntegration": False, "publishable": False,
            "checks": [row("offline-check", "offline"),
                       row("shell-check", "shell-helpers"),
                       row("loopback-check", "loopback")]}


class CliBoundaryTests(unittest.TestCase):
    def invoke(self, args, matched=True):
        stdout, stderr = io.StringIO(), io.StringIO()
        def result(check):
            return {"id": check["id"], "matched_expected_behavior": matched}
        with patch.object(tool, "PLAN_PATH") as source, \
             patch.object(tool, "execute", side_effect=result) as execute, \
             contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            source.read_text.return_value = json.dumps(plan())
            try:
                code = tool.main(args)
            except SystemExit as error:
                code = error.code
        return code, stdout.getvalue(), execute.call_args_list

    def test_listing_never_executes(self):
        code, output, calls = self.invoke([])
        self.assertEqual(code, 0)
        self.assertEqual(calls, [])
        data = json.loads(output)
        self.assertEqual(data["status"], "listing-only")
        self.assertIs(data["runtimeIntegration"], False)
        self.assertIs(data["publishable"], False)

    def test_selections_without_run_never_execute(self):
        for args in (["--only", "offline-check"],
                     ["--include-shell-helpers"], ["--include-loopback"]):
            with self.subTest(args=args):
                code, output, calls = self.invoke(args)
                self.assertEqual((code, output, calls), (2, "", []))

    def test_run_defaults_to_offline(self):
        code, output, calls = self.invoke(["--run"])
        self.assertEqual(code, 0)
        self.assertEqual([call.args[0]["id"] for call in calls], ["offline-check"])
        data = json.loads(output)
        self.assertEqual(data["status"], "selected-check-contracts-only")
        self.assertIs(data["runtimeIntegration"], False)
        self.assertIs(data["publishable"], False)

    def test_effect_opt_ins_are_independent(self):
        for label, wrong_flag, right_flag in (
            ("shell-check", "--include-loopback", "--include-shell-helpers"),
            ("loopback-check", "--include-shell-helpers", "--include-loopback")):
            with self.subTest(label=label):
                for extra in ([], [wrong_flag]):
                    code, output, calls = self.invoke(["--run", "--only", label] + extra)
                    self.assertEqual((code, output, calls), (2, "", []))
                code, output, calls = self.invoke(["--run", "--only", label, right_flag])
                self.assertEqual(code, 0)
                self.assertEqual([call.args[0]["id"] for call in calls], [label])

    def test_invalid_or_duplicate_selection_never_executes(self):
        for labels in (["unknown"], ["offline-check", "offline-check"]):
            with self.subTest(labels=labels):
                code, output, calls = self.invoke(["--run", "--only"] + labels)
                self.assertEqual((code, output, calls), (2, "", []))

    def test_mismatch_returns_failure(self):
        code, output, calls = self.invoke(["--run"], matched=False)
        self.assertEqual(code, 1)
        self.assertEqual(len(calls), 1)
        self.assertIs(json.loads(output)["results"][0]["matched_expected_behavior"], False)


if __name__ == "__main__":
    unittest.main()
