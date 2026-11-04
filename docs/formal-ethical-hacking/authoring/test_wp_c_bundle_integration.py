"""Actual-checkout archive construction only; no teaching application execution or publication."""
import hashlib
import json
from pathlib import Path
import shlex
import tempfile
import unittest
import zipfile
import wp_c_bundle as bundle

ROOT = Path(__file__).resolve().parents[3]


class ActualSourceBundleTests(unittest.TestCase):
    def check_stage(self, stage, module, source_members, read_exposed):
        with tempfile.TemporaryDirectory() as work:
            target = Path(work) / (stage + ".zip")
            manifest = bundle.build(ROOT, target, stage)
            self.assertTrue(target.is_file())
            with zipfile.ZipFile(target) as archive:
                self.assertIsNone(archive.testzip())
                names = archive.namelist()
                expected = source_members | {"README.md", "bundle-manifest.json", "INVESTIGATION-REPORT-TEMPLATE.md"}
                self.assertEqual(set(names), expected)
                self.assertEqual(len(names), len(expected))
                self.assertEqual(json.loads(archive.read("bundle-manifest.json")), manifest)
                self.assertEqual(manifest["read_repair_exposed"], read_exposed)
                self.assertEqual(manifest["stage"], stage)
                self.assertEqual(len(manifest["files"]), len(bundle.STAGES[stage]))
                for item in manifest["files"]:
                    data = archive.read(item["member"])
                    self.assertEqual(data, (ROOT / item["source"]).read_bytes())
                    self.assertEqual(bundle.blob(data), bundle.PINS[item["source"]])
                    self.assertEqual(item["git_blob"], bundle.PINS[item["source"]])
                    self.assertEqual(item["sha256"], hashlib.sha256(data).hexdigest())
                text = archive.read("README.md").decode("utf-8")
                listed = text.split("## Included files\n", 1)[1].split("\n\n", 1)[0]
                self.assertEqual({line[2:] for line in listed.splitlines()}, expected)
                commands = [shlex.split(line) for line in text.splitlines() if line.startswith("python3 ")]
                self.assertEqual(commands, [["python3", "-B", "-m", "unittest", "-v", module]])
                self.assertIn(module + ".py", names)
                self.assertIn("not enforced by this offline builder", text)
                self.assertIn("No class certificates, badges, XP or points", text)

    def test_read_repair_actual_sources(self):
        self.check_stage("read-repair", "test_application",
                         {"application_lab.py", "test_application.py"}, False)

    def test_update_repair_actual_sources(self):
        self.check_stage("update-repair", "test_updates",
                         {"application_lab.py", "application_repaired.py", "update_lab.py", "test_updates.py"}, True)


if __name__ == "__main__":
    unittest.main()
