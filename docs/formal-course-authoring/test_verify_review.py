import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys
from build_review import build, blob
from verify_review import verify

class OutputTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "repo"
        self.out = Path(self.tmp.name) / "books"
        self.out.mkdir()
        cat = json.dumps({"schemaVersion": 1, "status": "draft-not-published", "runtimeIntegration": False, "publishable": False, "labDelivery": "student-built", "lessons": [{"id": "EH-LAB-00", "requires": []}]})
        soc = "export const SOC_COURSE = " + json.dumps({"key": "soc-analyst", "modules": [{"number": 1, "title": "Triage", "overview": "Teaching", "lessonXp": 25, "quiz": {"correctExplanation": "PRIVATE_ANSWER"}}]}) + ";\n"
        self.manifest = {"schemaVersion": 1, "audience": "owner-authoring-only", "publishable": False, "runtimeIntegration": False, "sourceBase": "a" * 40, "catalogueGitBlob": blob(cat.encode()), "socGitBlob": blob(soc.encode()), "canonicalIds": ["EH-LAB-00"], "supporting": ["WINDOWS-FOUNDATIONS-01.md"], "socModuleNumbers": [1]}
        self.put("docs/formal-ethical-hacking/curriculum-catalogue.json", cat)
        self.put("soc-analyst.js", soc)
        self.put("docs/formal-ethical-hacking/lessons/EH-LAB-00.md", "Original & <script>not executed</script>\n[Instructor](PRIVATE.md)\n")
        self.put("docs/formal-ethical-hacking/lessons/WINDOWS-FOUNDATIONS-01.md", "Selected support\n")
        self.put("docs/formal-course-authoring/human-ai-assessment.md", "Human/AI: exact workshop \u03b1\n")
        self.put("docs/formal-course-authoring/incident-evidence-recovery.md", "IR staged case\n")
        self.put("docs/formal-course-authoring/manifest.json", json.dumps(self.manifest))
        for name, text in build(self.root, self.manifest).items():
            (self.out / name).write_text(text, encoding="utf-8")
    def put(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    def change(self, name, old, new):
        path = self.out / name
        text = path.read_text(encoding="utf-8")
        self.assertIn(old, text)
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
    def reject(self):
        with self.assertRaises((ValueError, OSError)):
            verify(self.root, self.out)
    def test_valid_round_trip_and_counts(self):
        result = verify(self.root, self.out)
        self.assertEqual((result["verifiedSources"], result["ethicalReviewSections"], result["incidentReviewSections"]), (6, 3, 3))
        self.assertIs(result["learnerPublicationAuthorized"], False)
    def test_read_only(self):
        before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for folder in (self.root, self.out) for p in folder.rglob("*") if p.is_file()}
        verify(self.root, self.out)
        self.assertEqual(before, {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for folder in (self.root, self.out) for p in folder.rglob("*") if p.is_file()})
    def test_shared_missing_in_eh(self):
        self.change("ethical-hacking-owner-review.html", "Human/AI: exact workshop", "OMITTED"); self.reject()
    def test_shared_missing_in_ir(self):
        self.change("incident-response-owner-review.html", "Human/AI: exact workshop", "OMITTED"); self.reject()
    def test_incident_case_missing(self):
        self.change("incident-response-owner-review.html", "IR staged case", "OMITTED"); self.reject()
    def test_source_changed_after_build(self):
        self.put("docs/formal-course-authoring/human-ai-assessment.md", "Changed after assembly"); self.reject()
    def test_forged_audit_hash(self):
        path = self.out / "source-audit.json"; audit = json.loads(path.read_text()); audit["sources"][0]["sha256"] = "0" * 64; path.write_text(json.dumps(audit)); self.reject()
    def test_boolean_count(self):
        self.change("source-audit.json", '"canonicalLessonCount": 1', '"canonicalLessonCount": true'); self.reject()
    def test_duplicate_json_key(self):
        self.change("source-audit.json", '"audience": "owner-authoring-only"', '"audience": "owner-authoring-only", "audience": "owner-authoring-only"'); self.reject()
    def test_activated_script(self):
        self.change("ethical-hacking-owner-review.html", "&lt;script&gt;not executed&lt;/script&gt;", "<script>not executed</script>"); self.reject()
    def test_active_instructor_link(self):
        self.change("ethical-hacking-owner-review.html", "[Instructor](PRIVATE.md)", '<a href="PRIVATE.md">Instructor</a>'); self.reject()
    def test_soc_private_fields_injected(self):
        self.change("incident-response-owner-review.html", '&quot;overview&quot;: &quot;Teaching&quot;', '&quot;overview&quot;: &quot;Teaching&quot;, &quot;correctExplanation&quot;: &quot;PRIVATE_ANSWER&quot;'); self.reject()
    def test_wrong_section_label(self):
        self.change("ethical-hacking-owner-review.html", "<h2>EH-LAB-00</h2>", "<h2>EH-LAB-99</h2>"); self.reject()
    def test_wrong_navigation_target(self):
        self.change("ethical-hacking-owner-review.html", 'href="#s0"', 'href="#s9"'); self.reject()
    def test_missing_owner_warning(self):
        self.change("incident-response-owner-review.html", "Owner authoring only.", "Published course."); self.reject()
    def test_truncated_book(self):
        path = self.out / "ethical-hacking-owner-review.html"; path.write_text(path.read_text()[:-7]); self.reject()
    def test_output_symlink(self):
        path = self.out / "source-audit.json"; saved = self.out.parent / "audit-copy.json"; path.rename(saved); path.symlink_to(saved); self.reject()
    def test_unexpected_output(self):
        (self.out / "extra.txt").write_text("not selected"); self.reject()

    def test_legacy_pin_changed(self):
        path = self.root / "soc-analyst.js"; path.write_text(path.read_text() + "\n"); self.reject()
    def test_audit_limits_changed(self):
        self.change("source-audit.json", "Legacy SOC anchors are not a completed formal IR course.", "Completed course."); self.reject()
    def test_duplicate_section_id(self):
        self.change("ethical-hacking-owner-review.html", 'id="s1"', 'id="s0"'); self.reject()
    def test_style_drift(self):
        self.change("ethical-hacking-owner-review.html", "color:#edf1f7", "color:red"); self.reject()
    def test_missing_output(self):
        (self.out / "incident-response-owner-review.html").unlink(); self.reject()

    def test_cli_root_resolution(self):
        source = Path(__file__).with_name("verify_review.py")
        target = self.root / "docs/formal-course-authoring/verify_review.py"
        target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
        result = subprocess.run([sys.executable, "-B", str(target), "--output", str(self.out)], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["verifiedSources"], 6)

if __name__ == "__main__":
    unittest.main()
