"""Report-control tests using fakes. Never launch a browser, child or listener."""
from contextlib import redirect_stdout, redirect_stderr
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import MagicMock, Mock, patch
import browser_smoke as smoke
import training_site as site

class ReportTests(unittest.TestCase):
    def invoke(self, effect=None, launch_error=None, blocked=False):
        parent = types.ModuleType("playwright"); parent.__path__ = []
        api = types.ModuleType("playwright.sync_api")
        manager = MagicMock(); driver = manager.__enter__.return_value
        api.sync_playwright = Mock(return_value=manager); parent.sync_api = api
        launch = driver.chromium.launch
        launch.side_effect = launch_error
        launch.return_value.version = "FICTIONAL-TEST-BROWSER"
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            with patch.dict(sys.modules, {"playwright":parent,"playwright.sync_api":api}), \
                 patch("importlib.metadata.version", return_value="FICTIONAL-TEST-TOOL"), \
                 patch.object(site,"require_runtime",side_effect=RuntimeError("FICTIONAL blocked") if blocked else None), \
                 patch.object(smoke,"phase",side_effect=effect) as phase, \
                 patch.object(smoke,"__file__",str(root/"browser_smoke.py")), \
                 patch.object(sys,"argv",["browser_smoke.py"]), \
                 patch.object(smoke.subprocess,"Popen",side_effect=AssertionError("Real child forbidden")) as child, \
                 redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                result = smoke.main()
                child.assert_not_called()
            report_file = root/"browser-smoke-report.json"
            report = json.loads(report_file.read_text()) if report_file.exists() else None
        if blocked: launch.assert_not_called(); phase.assert_not_called()
        else: launch.assert_called_once_with(channel="chrome",headless=True,chromium_sandbox=True,timeout=15000)
        return result, report

    def test_gate_blocks_before_launch(self):
        result, report = self.invoke(blocked=True)
        self.assertEqual(result,2); self.assertIsNone(report)

    def test_launch_failure_is_not_success(self):
        result, report = self.invoke(launch_error=RuntimeError("FICTIONAL launch failure"))
        self.assertEqual(result,1); self.assertFalse(report["passed"])
        self.assertEqual(report["sessions"],[]); self.assertEqual(report["error_type"],"RuntimeError")

    def test_incomplete_counts_are_not_success(self):
        def partial(browser,plan,records):
            records.append({"continued_gets":1,"sigint_exit_zero":True,"forced_cleanup":False})
        result, report = self.invoke(effect=partial)
        self.assertEqual(result,1); self.assertFalse(report["passed"])

    def test_forced_cleanup_is_not_success(self):
        def forced(browser,plan,records):
            records.append({"continued_gets":len(plan),"sigint_exit_zero":True,"forced_cleanup":True})
        result, report = self.invoke(effect=forced)
        self.assertEqual(result,1); self.assertFalse(report["passed"])

    def test_clean_mocked_plans_are_accepted(self):
        def clean(browser,plan,records):
            records.append({"continued_gets":len(plan),"sigint_exit_zero":True,"forced_cleanup":False})
        result, report = self.invoke(effect=clean)
        self.assertEqual(result,0); self.assertTrue(report["passed"])
        self.assertEqual([s["continued_gets"] for s in report["sessions"]],[21,4])
        self.assertEqual(report["browser_channel"],"chrome"); self.assertTrue(report["sandbox_requested"])

if __name__ == "__main__": unittest.main()
