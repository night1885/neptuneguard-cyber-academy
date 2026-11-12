import json
import tempfile
import unittest
from pathlib import Path
from copy import deepcopy
from build_review import blob,strict_json,read_source,validate_catalogue,soc_projection,render,build

class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
        self.catalogue={"schemaVersion":1,"status":"draft-not-published","runtimeIntegration":False,"publishable":False,"labDelivery":"student-built","lessons":[{"id":"EH-LAB-00","requires":[]},{"id":"EH-LAB-01","requires":["EH-LAB-00"]}]}
        self.soc={"key":"soc-analyst","modules":[{"number":1,"title":"Triage","overview":"Legacy teaching anchor","lessonXp":25,"quiz":{"correctExplanation":"HIDDEN_ANSWER"}}]}
        cat=json.dumps(self.catalogue);soc="export const SOC_COURSE = "+json.dumps(self.soc)+";\n"
        self.put("docs/formal-ethical-hacking/curriculum-catalogue.json",cat);self.put("soc-analyst.js",soc)
        for name in("EH-LAB-00.md","EH-LAB-01.md","WINDOWS-FOUNDATIONS-01.md"):self.put("docs/formal-ethical-hacking/lessons/"+name,"# Original source\n<script>not executed</script>\n[Instructor](SECRET-INSTRUCTOR.md)\n")
        self.put("docs/formal-course-authoring/human-ai-assessment.md","# Human/AI draft\n")
        self.put("docs/formal-course-authoring/incident-evidence-recovery.md","# Incident draft\n")
        self.manifest={"schemaVersion":1,"audience":"owner-authoring-only","publishable":False,"runtimeIntegration":False,"sourceBase":"a"*40,"catalogueGitBlob":blob(cat.encode()),"socGitBlob":blob(soc.encode()),"canonicalIds":["EH-LAB-00","EH-LAB-01"],"supporting":["WINDOWS-FOUNDATIONS-01.md"],"socModuleNumbers":[1]}
    def put(self,path,text):
        p=self.root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text);return p
    def test_complete_synthetic_build(self):
        out=build(self.root,self.manifest);a=json.loads(out["source-audit.json"])
        self.assertEqual((a["canonicalLessonCount"],a["ethicalReviewSections"],a["incidentReviewSections"]),(2,4,3))
    def test_no_input_mutation(self):
        before=deepcopy(self.manifest);build(self.root,self.manifest);self.assertEqual(self.manifest,before)
    def test_source_content_preserved_as_escaped_text(self):
        out=build(self.root,self.manifest)["ethical-hacking-owner-review.html"];self.assertIn("&lt;script&gt;not executed&lt;/script&gt;",out);self.assertNotIn("<script>",out)
    def test_no_followed_instructor_link(self):
        out=build(self.root,self.manifest)["ethical-hacking-owner-review.html"];self.assertNotIn('href="SECRET-INSTRUCTOR.md"',out)
    def test_soc_excludes_answers_rewards(self):
        out=build(self.root,self.manifest)["incident-response-owner-review.html"];self.assertNotIn("HIDDEN_ANSWER",out);self.assertNotIn("lessonXp",out)
    def test_wrong_pin_rejected(self):
        self.manifest["catalogueGitBlob"]="0"*40
        with self.assertRaises(ValueError):build(self.root,self.manifest)
    def test_soc_trailing_code_rejected(self):
        with self.assertRaises(ValueError):soc_projection("export const SOC_COURSE = "+json.dumps(self.soc)+";runSomething();",[1])
    def test_duplicate_json_rejected(self):
        with self.assertRaises(ValueError):strict_json('{"x":1,"x":2}')
    def test_reordered_catalogue_rejected(self):
        self.catalogue["lessons"].reverse()
        with self.assertRaises(ValueError):validate_catalogue(self.catalogue,["EH-LAB-00","EH-LAB-01"])
    def test_cycle_rejected(self):
        self.catalogue["lessons"][0]["requires"]=["EH-LAB-01"]
        with self.assertRaises(ValueError):validate_catalogue(self.catalogue,["EH-LAB-00","EH-LAB-01"])
    def test_unknown_prerequisite_rejected(self):
        self.catalogue["lessons"][0]["requires"]=["EH-LAB-99"]
        with self.assertRaises(ValueError):validate_catalogue(self.catalogue,["EH-LAB-00","EH-LAB-01"])
    def test_learner_audience_rejected(self):
        self.manifest["audience"]="learner"
        with self.assertRaises(ValueError):build(self.root,self.manifest)
    def test_publishable_rejected(self):
        self.manifest["publishable"]=True
        with self.assertRaises(ValueError):build(self.root,self.manifest)
    def test_runtime_rejected(self):
        self.manifest["runtimeIntegration"]=True
        with self.assertRaises(ValueError):build(self.root,self.manifest)
    def test_missing_source_rejected(self):
        (self.root/"docs/formal-ethical-hacking/lessons/EH-LAB-00.md").unlink()
        with self.assertRaises(ValueError):build(self.root,self.manifest)
    def test_traversal_rejected(self):
        with self.assertRaises(ValueError):read_source(self.root,"../secret")
    def test_symlink_rejected(self):
        self.put("real.txt","value");(self.root/"link.txt").symlink_to(self.root/"real.txt")
        with self.assertRaises(ValueError):read_source(self.root,"link.txt")
    def test_empty_source_rejected(self):
        self.put("empty.txt","")
        with self.assertRaises(ValueError):read_source(self.root,"empty.txt")
    def test_binary_marker_rejected(self):
        self.put("binary.txt","a\0b")
        with self.assertRaises(ValueError):read_source(self.root,"binary.txt")
    def test_oversize_source_rejected(self):
        self.put("large.txt","x"*262145)
        with self.assertRaises(ValueError):read_source(self.root,"large.txt")
    def test_instructor_source_not_selected(self):
        self.manifest["supporting"]=["WINDOWS-FOUNDATIONS-INSTRUCTOR.md"]
        with self.assertRaises(ValueError):build(self.root,self.manifest)
    def test_soc_order_rejected(self):
        with self.assertRaises(ValueError):soc_projection("export const SOC_COURSE = "+json.dumps(self.soc)+";",[2])
    def test_title_escaped(self):self.assertNotIn("<script>",render("<script>",[("<script>","<script>")]))

if __name__=="__main__":unittest.main()
