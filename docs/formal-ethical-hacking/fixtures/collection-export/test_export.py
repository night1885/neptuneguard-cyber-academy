"""Visible reused requirements. No authentication, HTTP transport or formal grading."""
from copy import deepcopy
import json
import unittest
import export_lab as lab

class ExportTests(unittest.TestCase):
    factory = staticmethod(lab.make_app)
    def setUp(self):
        self.app = self.factory()
    def export_ids(self, actor=lab.LEARNER):
        return [row["id"] for row in self.app.export(actor)["rows"]]
    def test_owner_detail(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"R01")["outcome"],"ok")
    def test_shared_detail(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"R04")["outcome"],"ok")
    def test_unshared_nonowner_detail(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"R02"),{"outcome":"not-found","record":None})
    def test_other_board_detail(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"R03")["outcome"],"not-found")
    def test_retired_detail(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"R05")["outcome"],"not-found")
    def test_missing_detail(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"MISSING"),self.app.detail(lab.LEARNER,"R02"))
    def test_detail_projection(self):
        self.assertEqual(set(self.app.detail(lab.LEARNER,"R01")["record"]),{"id","title","state"})
    def test_contributor_export_set(self):
        self.assertEqual(self.export_ids(),["R01"])
    def test_reviewer_export_set(self):
        self.assertEqual(self.export_ids(lab.REVIEWER),["R02"])
    def test_export_projection(self):
        for row in self.app.export(lab.LEARNER)["rows"]:
            with self.subTest(record=row["id"]):
                self.assertEqual(set(row),{"id","title","state"})
    def test_internal_memo_absent(self):
        self.assertNotIn("FICTIONAL INTERNAL",json.dumps(self.app.export(lab.LEARNER)))
    def test_shared_read_does_not_grant_export(self):
        self.assertEqual(self.app.detail(lab.LEARNER,"R04")["outcome"],"ok")
        self.assertNotIn("R04",self.export_ids())
    def test_missing_actor(self):
        self.assertEqual(self.app.export(None),{"outcome":"denied","rows":[],"count":0})
    def test_malformed_actor(self):
        self.assertEqual(self.app.export(lab.Actor("learner-a","contributor",["board-a"]))["outcome"],"denied")
    def test_unknown_role(self):
        self.assertEqual(self.export_ids(lab.Actor("learner-a","visitor",("board-a",))),[])
    def test_other_board_not_exported(self):
        self.assertNotIn("R03",self.export_ids())
    def test_export_does_not_mutate_records(self):
        before=deepcopy(self.app.records);self.app.export(lab.LEARNER)
        self.assertEqual(self.app.records,before)
    def test_returned_title_not_alias_to_source(self):
        response=self.app.export(lab.LEARNER);response["rows"][0]["title"]="FICTIONAL changed response"
        self.assertEqual(self.app.records[0]["title"],"FICTIONAL own plan")
    def test_empty_collection(self):
        self.app.records=()
        self.assertEqual(self.app.export(lab.LEARNER),{"outcome":"ok","rows":[],"count":0})
    def test_summary_count_matches_returned_rows(self):
        response=self.app.export(lab.LEARNER)
        self.assertEqual(response["count"],len(response["rows"]))

if __name__ == "__main__":
    unittest.main()
