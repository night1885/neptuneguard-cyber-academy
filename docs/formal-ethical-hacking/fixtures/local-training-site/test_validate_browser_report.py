"""Invented fixtures, not CI evidence. No browser, launcher or network."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import validate_browser_report as check


def fixture():
    return {"synthetic":True,"passed":True,"effective_uid":1001,"python":"3.12.0",
            "playwright":"1.64.1","browser":"FICTIONAL-TEST-BUILD","browser_channel":"chrome",
            "sandbox_requested":True,"sessions":[
                {"planned_gets":len(statuses),"continued_gets":len(statuses),"statuses":list(statuses),
                 "aborted_context_requests":0,"sigint_exit_zero":True,"forced_cleanup":False}
                for statuses in check.EXPECTED]}


class ConsistencyTests(unittest.TestCase):
    def test_invented_consistent_shape(self):self.assertEqual(check.check_report(fixture()),[])
    def test_failed_flag(self):
        report=fixture();report["passed"]=False;self.assertTrue(check.check_report(report))
    def test_uid_requires_nonroot_integer(self):
        for value in (0,-1,True,"1001",None):
            report=fixture();report["effective_uid"]=value
            with self.subTest(value=value):self.assertTrue(check.check_report(report))
    def test_versions_required(self):
        for key in ("python","playwright","browser"):
            report=fixture();report.pop(key)
            with self.subTest(key=key):self.assertTrue(check.check_report(report))
    def test_channel_and_requested_sandbox(self):
        for key,value in (("browser_channel","chromium"),("sandbox_requested",False)):
            report=fixture();report[key]=value;self.assertTrue(check.check_report(report))
    def test_exact_session_count_and_type(self):
        for value in (None,[],[{}],[None,None],[{}, {}, {}]):
            report=fixture();report["sessions"]=value;self.assertTrue(check.check_report(report))
    def test_exact_counts(self):
        for key,value in (("planned_gets",20),("continued_gets",20),("continued_gets","21")):
            report=fixture();report["sessions"][0][key]=value;self.assertTrue(check.check_report(report))
    def test_ordered_statuses_and_budget(self):
        for values in ([200]*21, [200,200,404,404], [], [float(v) for v in check.EXPECTED[0]]):
            report=fixture();report["sessions"][0]["statuses"]=values;self.assertTrue(check.check_report(report))
    def test_cleanup_flags(self):
        for key,value in (("forced_cleanup",True),("forced_cleanup",0),("sigint_exit_zero",False)):
            report=fixture();report["sessions"][1][key]=value;self.assertTrue(check.check_report(report))
    def test_aborted_count_type(self):
        for value in (-1,True,"0"):
            report=fixture();report["sessions"][0]["aborted_context_requests"]=value;self.assertTrue(check.check_report(report))
    def test_error_fields_rejected(self):
        report=fixture();report["error_type"]="";self.assertTrue(check.check_report(report))


class CliTests(unittest.TestCase):
    def run_cli(self, text=None):
        script=Path(check.__file__).resolve()
        with tempfile.TemporaryDirectory() as temp:
            args=[sys.executable,"-B",str(script)]
            if text is not None:
                path=Path(temp)/"fictional-report.json";path.write_text(text);args.append(str(path))
            result=subprocess.run(args,cwd=temp,capture_output=True,text=True,timeout=5)
        self.assertEqual(result.stderr,"")
        return result.returncode,json.loads(result.stdout)
    def test_consistent_cli_never_authenticates(self):
        code,report=self.run_cli(json.dumps(fixture()))
        self.assertEqual(code,0);self.assertTrue(report["consistent"])
        self.assertFalse(report["provenance_verified"]);self.assertEqual(report["total_gets"],25)
    def test_invalid_or_oversized_json(self):
        for text in ("{", " "*(check.MAX_BYTES+1), '{"passed":true,"passed":false}', '{"value":NaN}'):
            code,report=self.run_cli(text);self.assertEqual(code,2);self.assertFalse(report["consistent"])
    def test_inconsistent_shape_exit(self):
        code,report=self.run_cli("{}");self.assertEqual(code,1);self.assertFalse(report["consistent"])
    def test_usage_exit(self):
        code,report=self.run_cli();self.assertEqual(code,2);self.assertFalse(report["consistent"])

if __name__ == "__main__":unittest.main()
