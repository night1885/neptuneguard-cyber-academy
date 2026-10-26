"""Additional reference-path checks over invented in-memory data; no HTTP transport."""
import json,unittest
from unittest.mock import Mock
import application_lab as lab
import application_repaired as reference
class AdditionalTests(unittest.TestCase):
 def setUp(self):self.app=reference.make_app();self.addCleanup(self.app.close)
 def request(self,**kw):return lab.call_app(self.app,lab.ALICE,kw.pop('path','/notes/note-a'),**kw)
 def test_empty_key(self):self.assertEqual(self.request(path='/notes/')['status'],'404 Not Found')
 def test_slash_key(self):self.assertEqual(self.request(path='/notes/note-a/extra')['status'],'404 Not Found')
 def test_oversized_key(self):self.assertEqual(self.request(path='/notes/'+'x'*65)['status'],'404 Not Found')
 def test_wrong_route_prefix(self):self.assertEqual(self.request(path='/other/note-a')['status'],'404 Not Found')
 def test_headers_cannot_override_trusted_context(self):
  with self.assertRaises(ValueError):self.request(headers={'ng.actor':lab.TEACHER})
 def test_unicode_text_representation_length(self):
  self.app.connection.execute('UPDATE notes SET text=? WHERE id=?',('FICTIONAL café','note-a'))
  response=self.request();self.assertEqual(response['status'],'200 OK')
  self.assertEqual(json.loads(response['body'])['note']['text'],'FICTIONAL café')
  self.assertEqual(int(response['headers']['Content-Length']),len(response['body']))
 def test_denied_head_representation_length(self):
  get=self.request(path='/notes/note-b');head=self.request(path='/notes/note-b',method='HEAD')
  self.assertEqual(head['status'],'404 Not Found');self.assertEqual(head['body'],b'')
  self.assertEqual(int(head['headers']['Content-Length']),len(get['body']))
 def test_read_keeps_stored_records_unchanged(self):
  before=[tuple(r) for r in self.app.connection.execute('SELECT * FROM notes ORDER BY id')]
  self.request();after=[tuple(r) for r in self.app.connection.execute('SELECT * FROM notes ORDER BY id')]
  self.assertEqual(before,after)
 def test_absent_record_short_circuits_policy(self):
  policy=Mock(side_effect=AssertionError('Policy should not receive absent row'));self.app.policy=policy
  self.assertEqual(self.request(path='/notes/missing')['status'],'404 Not Found');policy.assert_not_called()
 def test_policy_denial_reaches_generic_response(self):
  policy=Mock(return_value=False);self.app.policy=policy;response=self.request()
  self.assertEqual(response['status'],'404 Not Found');self.assertNotIn('note',json.loads(response['body']))
  self.assertEqual(policy.call_count,1);self.assertEqual(policy.call_args.args[0],lab.ALICE)
 def test_query_precedes_actor_gate_in_fixture(self):
  response=lab.call_app(self.app,None,'/notes/note-a',query='unsupported')
  self.assertEqual(response['status'],'400 Bad Request');self.assertNotIn('note',json.loads(response['body']))
 def test_method_precedes_actor_gate_in_fixture(self):
  response=lab.call_app(self.app,None,'/notes/note-a',method='POST')
  self.assertEqual(response['status'],'405 Method Not Allowed');self.assertEqual(response['headers']['Allow'],'GET, HEAD')
if __name__=='__main__':unittest.main()
