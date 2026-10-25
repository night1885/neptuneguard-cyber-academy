"""Additional visible practice/regression checks, not a complete security suite."""
import json
from pathlib import Path
import tempfile
import unittest
from summarize_observations import MAX_BYTES, MAX_RECORDS, GROUPS, load_records, validate_document, summarize
FIXTURE=Path(__file__).with_name('observations.json')
class AdditionalTests(unittest.TestCase):
 def setUp(self): self.document=json.loads(FIXTURE.read_text(encoding='utf8'))
 def test_negative_client_exit(self):
  self.document['records'][0]['client_exit']=-1
  with self.assertRaises(ValueError): validate_document(self.document)
 def test_invalid_utf8(self):
  with tempfile.TemporaryDirectory() as work:
   p=Path(work)/'invalid.json';p.write_bytes(b'\xff')
   with self.assertRaises(ValueError): load_records(p)
 def test_exact_byte_boundary(self):
  raw=FIXTURE.read_bytes();raw+=b' '*(MAX_BYTES-len(raw))
  with tempfile.TemporaryDirectory() as work:
   p=Path(work)/'exact.json';p.write_bytes(raw)
   self.assertEqual(len(load_records(p)),8)
 def test_exact_record_boundary(self):
  records=[{'id':f'B{n:02}','method':'GET','http_status':200,'client_exit':0} for n in range(MAX_RECORDS)]
  self.assertEqual(summarize(validate_document({'synthetic':True,'records':records}))['record_count'],MAX_RECORDS)
 def test_boundary_status_values(self):
  for status,group in [(100,'1xx'),(599,'5xx')]:
   with self.subTest(status=status):
    d={'synthetic':True,'records':[{'id':'B01','method':'GET','http_status':status,'client_exit':0}]}
    self.assertEqual(summarize(validate_document(d))['status_groups'][group],1)
 def test_returned_records_are_copied(self):
  records=validate_document(self.document);self.document['records'][0]['client_exit']=7
  self.assertEqual(records[0]['client_exit'],0)
 def test_copied_dictionaries_are_not_immutable(self):
  records=validate_document(self.document);records[0]['client_exit']=7
  self.assertEqual(records[0]['client_exit'],7);self.assertEqual(self.document['records'][0]['client_exit'],0)
 def test_record_order_does_not_change_summary(self):
  baseline=summarize(validate_document(self.document));self.document['records'].reverse()
  self.assertEqual(summarize(validate_document(self.document)),baseline)
 def test_empty_groups_are_all_zero(self):
  report=summarize(validate_document({'synthetic':True,'records':[]}))
  self.assertEqual(report['status_groups'],dict.fromkeys(GROUPS,0));self.assertEqual(report['nonzero_client_exits'],0)
 def test_missing_field(self):
  del self.document['records'][0]['http_status']
  with self.assertRaises(ValueError): validate_document(self.document)
 def test_missing_file(self):
  with tempfile.TemporaryDirectory() as work:
   with self.assertRaises(OSError): load_records(Path(work)/'absent.json')
 def test_duplicate_textual_keys_are_not_rejected_by_default_decoder(self):
  parsed=json.loads('{"synthetic":false,"synthetic":true,"records":[]}')
  self.assertEqual(validate_document(parsed),())
if __name__=='__main__': unittest.main()
