"""Additional text-only reference requirements over test-owned in-memory state."""
import json,unittest
import update_lab as lab
import update_repaired as reference
class AdditionalTests(unittest.TestCase):
 def setUp(self):self.app=reference.make_app();self.addCleanup(self.app.close)
 def row(self):return dict(self.app.connection.execute('SELECT * FROM notes WHERE id=?',('note-a',)).fetchone())
 def edit(self,text='FICTIONAL edited',revision=0,**fields):
  return lab.request(self.app,lab.ALICE,method='PATCH',document={'text':text,'expected_revision':revision,**fields})
 def rejected_unchanged(self,call):
  before=self.row();response=call();self.assertEqual(response['status'],'400 Bad Request');self.assertEqual(self.row(),before)
 def test_minimum_text(self):
  self.assertEqual(self.edit(text='X')['status'],'200 OK');self.assertEqual((self.row()['text'],self.row()['revision']),('X',1))
 def test_maximum_text(self):
  self.assertEqual(self.edit(text='X'*256)['status'],'200 OK');self.assertEqual(len(self.row()['text']),256)
 def test_text_too_long_no_change(self):self.rejected_unchanged(lambda:self.edit(text='X'*257))
 def test_exact_body_byte_limit(self):
  raw=json.dumps({'text':'FICTIONAL boundary','expected_revision':0}).encode();raw+=b' '*(1024-len(raw))
  response=lab.request(self.app,lab.ALICE,method='PATCH',raw=raw)
  self.assertEqual(response['status'],'200 OK');self.assertEqual(self.row()['revision'],1)
 def test_empty_body_no_change(self):self.rejected_unchanged(lambda:lab.request(self.app,lab.ALICE,method='PATCH',raw=b''))
 def test_invalid_utf8_no_change(self):self.rejected_unchanged(lambda:lab.request(self.app,lab.ALICE,method='PATCH',raw=b'\xff'))
 def test_revision_above_contract_no_change(self):self.rejected_unchanged(lambda:self.edit(revision=1000001))
 def test_missing_text_no_change(self):self.rejected_unchanged(lambda:lab.request(self.app,lab.ALICE,method='PATCH',document={'expected_revision':0}))
 def test_multiple_forbidden_fields_no_partial_change(self):self.rejected_unchanged(lambda:self.edit(owner='student-b',course='course-b',state='submitted'))
 def test_same_text_still_increments_revision(self):
  old=self.row();response=self.edit(text=old['text'])
  self.assertEqual(response['status'],'200 OK');self.assertEqual(self.row()['text'],old['text']);self.assertEqual(self.row()['revision'],1)
 def test_two_sequential_current_revision_updates(self):
  self.assertEqual(self.edit(text='FICTIONAL first',revision=0)['status'],'200 OK')
  self.assertEqual(self.edit(text='FICTIONAL second',revision=1)['status'],'200 OK')
  self.assertEqual((self.row()['text'],self.row()['revision']),('FICTIONAL second',2))
 def test_stale_after_current_update_preserves_entire_row(self):
  self.assertEqual(self.edit()['status'],'200 OK');before=self.row()
  response=self.edit(text='FICTIONAL stale',revision=0)
  self.assertEqual(response['status'],'409 Conflict');self.assertEqual(self.row(),before)
 def test_postcommit_read_error_is_not_no_change_proof(self):
  class FailSecondHandlerRead:
   def __init__(self,connection):self.connection=connection;self.reads=0
   def __getattr__(self,name):return getattr(self.connection,name)
   def __enter__(self):self.connection.__enter__();return self
   def __exit__(self,*args):return self.connection.__exit__(*args)
   def execute(self,sql,*args):
    if sql=='SELECT * FROM notes WHERE id = ?':
     self.reads+=1
     if self.reads==2:
      import sqlite3
      raise sqlite3.OperationalError('FICTIONAL post-commit read failure')
    return self.connection.execute(sql,*args)
  self.app.connection=FailSecondHandlerRead(self.app.connection)
  response=self.edit(text='FICTIONAL committed before read failure')
  self.assertEqual(response['status'],'503 Service Unavailable')
  self.assertEqual((self.row()['text'],self.row()['revision']),('FICTIONAL committed before read failure',1))
  self.assertNotIn(b'FICTIONAL post-commit read failure',response['body'])
if __name__=='__main__':unittest.main()
