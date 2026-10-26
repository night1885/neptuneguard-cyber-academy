"""Mock-only contract checks. No helper execution, layout creation or privilege action."""
import io,json,os,subprocess,unittest
from contextlib import redirect_stdout,redirect_stderr
from pathlib import Path
from unittest.mock import patch
import search_lab as lab
import search_repaired as repaired
class ContractTests(unittest.TestCase):
 def setUp(self):
  self.block=patch('search_lab.subprocess.run',side_effect=AssertionError('Real launch forbidden in mock-only suite'))
  self.block.start();self.addCleanup(self.block.stop)
 def test_launch_uses_list_and_no_optional_shell(self):
  with patch('search_lab.subprocess.run') as run:
   lab.launch(Path('/FICTIONAL'),lab.HELPER,False)
   args,kw=run.call_args;self.assertEqual(args[0],[lab.HELPER]);self.assertIs(kw['shell'],False)
 def test_launch_trusted_order(self):
  with patch('search_lab.subprocess.run') as run:
   lab.launch(Path('/FICTIONAL'),lab.HELPER,False)
   self.assertEqual(run.call_args.kwargs['env'],{'PATH':'/FICTIONAL/trusted'+os.pathsep+'/FICTIONAL/untrusted'})
 def test_launch_other_order(self):
  with patch('search_lab.subprocess.run') as run:
   lab.launch(Path('/FICTIONAL'),lab.HELPER,True)
   self.assertEqual(run.call_args.kwargs['env'],{'PATH':'/FICTIONAL/untrusted'+os.pathsep+'/FICTIONAL/trusted'})
 def test_launch_bounds_and_io(self):
  with patch('search_lab.subprocess.run') as run:
   root=Path('/FICTIONAL');lab.launch(root,lab.HELPER,False);kw=run.call_args.kwargs
   self.assertEqual(kw['cwd'],root);self.assertEqual(kw['stdin'],subprocess.DEVNULL);self.assertEqual(kw['timeout'],3);self.assertIs(kw['capture_output'],True);self.assertIs(kw['text'],True)
 def test_parent_environment_unchanged(self):
  before=dict(os.environ)
  with patch('search_lab.subprocess.run'):lab.launch(Path('/FICTIONAL'),lab.HELPER,True)
  self.assertEqual(dict(os.environ),before)
 def test_starter_routes_basename(self):
  root=Path('/FICTIONAL')
  with patch('search_lab.checked_layout',return_value=root),patch('search_lab.launch') as launch:
   lab.run_probe(root,True);launch.assert_called_once_with(root,lab.HELPER,True)
 def test_reference_routes_explicit_path(self):
  root=Path('/FICTIONAL')
  with patch('search_lab.checked_layout',return_value=root),patch('search_lab.launch') as launch:
   repaired.run_probe(root,True);launch.assert_called_once_with(root,str(root/'trusted'/lab.HELPER),True)
 def test_checked_layout_error_prevents_reference_launch(self):
  with patch('search_lab.checked_layout',side_effect=ValueError('FICTIONAL')),patch('search_lab.launch') as launch:
   with self.assertRaises(ValueError):repaired.run_probe('/FICTIONAL',False)
   launch.assert_not_called()
 def test_nonposix_gate(self):
  with patch('search_lab.os.name','nt'):
   with self.assertRaises(RuntimeError):lab.require_runtime()
 def test_missing_interpreter_gate(self):
  with patch('search_lab.os.name','posix'),patch('search_lab.os.geteuid',return_value=1000),patch('search_lab.Path') as path:
   path.return_value.is_file.return_value=False
   with self.assertRaises(RuntimeError):lab.require_runtime()
 def test_order_type_rejected_before_layout(self):
  with patch('search_lab.require_runtime'):
   with self.assertRaises(ValueError):lab.checked_layout('/FICTIONAL','yes')
 def test_cli_arguments_rejected_before_demo(self):
  err=io.StringIO()
  with patch('search_lab.sys.argv',['search_lab.py','extra']),patch('search_lab.run_demo') as demo,redirect_stderr(err):
   self.assertEqual(lab.main(object()),2);demo.assert_not_called()
  self.assertEqual(err.getvalue().strip(),'No arguments accepted')
 def test_cli_dependency_error_is_blocked(self):
  err=io.StringIO()
  with patch('search_lab.sys.argv',['search_lab.py']),patch('search_lab.run_demo',side_effect=RuntimeError('FICTIONAL')),redirect_stderr(err):
   self.assertEqual(lab.main(object()),2)
  self.assertEqual(err.getvalue().strip(),'Teaching search demo blocked')
 def test_cli_status_tracks_mocked_selection_not_child_status(self):
  for selected,code in [(True,0),(False,1)]:
   with self.subTest(selected=selected):
    out=io.StringIO();report={'synthetic':True,'all_trusted':selected,'cases':[]}
    with patch('search_lab.sys.argv',['search_lab.py']),patch('search_lab.run_demo',return_value=report),redirect_stdout(out):
     self.assertEqual(lab.main(object()),code)
    self.assertEqual(json.loads(out.getvalue()),report)
 def test_root_rejected_before_interpreter_lookup(self):
  with patch('search_lab.os.name','posix'),patch('search_lab.os.geteuid',return_value=0),patch('search_lab.Path') as path:
   with self.assertRaises(RuntimeError):lab.require_runtime()
   path.assert_not_called()
 def test_missing_effective_uid_rejected(self):
  with patch('search_lab.os.name','posix'),patch('search_lab.os.geteuid',None),patch('search_lab.Path') as path:
   with self.assertRaises(RuntimeError):lab.require_runtime()
   path.assert_not_called()
 def test_nonroot_runtime_preconditions_with_mocked_platform(self):
  with patch('search_lab.os.name','posix'),patch('search_lab.os.geteuid',return_value=1000),patch('search_lab.Path') as path:
   path.return_value.is_file.return_value=True
   lab.require_runtime();path.assert_called_once_with('/bin/sh')
if __name__=='__main__':unittest.main()
