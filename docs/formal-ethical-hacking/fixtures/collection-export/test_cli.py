"""Selected local Python CLI checks; no network or real data."""
from pathlib import Path
import json,subprocess,sys,tempfile,unittest
ROOT=Path(__file__).resolve().parent
class CliTests(unittest.TestCase):
    def invoke(self,script,*args):
        with tempfile.TemporaryDirectory() as work:
            return subprocess.run([sys.executable,"-B",str(ROOT/script),*args],cwd=work,capture_output=True,text=True,timeout=10)
    def test_demo_contracts(self):
        for script,code,operation,projection in [("export_lab.py",1,False,False),("export_repaired.py",0,True,True)]:
            with self.subTest(script=script):
                result=self.invoke(script);self.assertEqual(result.returncode,code);self.assertEqual(result.stderr,"")
                report=json.loads(result.stdout)
                self.assertIs(report["synthetic"],True);self.assertIs(report["shared_detail_allowed"],True)
                self.assertIs(report["export_uses_operation_policy"],operation);self.assertIs(report["export_has_only_public_fields"],projection)
                self.assertNotIn("FICTIONAL INTERNAL",result.stdout)
    def test_arguments_rejected(self):
        for script in ("export_lab.py","export_repaired.py"):
            with self.subTest(script=script):
                result=self.invoke(script,"extra");self.assertEqual(result.returncode,2)
                self.assertEqual(result.stdout,"");self.assertEqual(result.stderr.strip(),"No arguments accepted")
if __name__ == "__main__":
    unittest.main()
