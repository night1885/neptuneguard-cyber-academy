"""Synthetic packaging checks; do not run teaching applications or build live learner releases."""
import json
from pathlib import Path
import tempfile
import unittest
import zipfile
import wp_c_bundle as b


class BundleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo"
        self.root.mkdir()
        self.output = Path(self.temp.name) / "bundle.zip"
        self.pins = {}
        for relative in b.PINS:
            p = self.root / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            data = ("synthetic: " + relative).encode()
            p.write_bytes(data)
            self.pins[relative] = b.blob(data)

    def build(self, stage="read"):
        return b.build(self.root, self.output, stage, pins=self.pins)

    def test_read_members(self):
        self.build()
        with zipfile.ZipFile(self.output) as z:
            self.assertEqual(set(z.namelist()), {"application_lab.py", "INVESTIGATION-REPORT-TEMPLATE.md", "README.md", "bundle-manifest.json"})

    def test_update_members(self):
        manifest = self.build("update")
        with zipfile.ZipFile(self.output) as z:
            self.assertEqual(set(z.namelist()), {"application_lab.py", "application_repaired.py", "update_lab.py", "INVESTIGATION-REPORT-TEMPLATE.md", "README.md", "bundle-manifest.json"})
        self.assertTrue(manifest["read_repair_exposed"])

    def test_unrelated_file_excluded(self):
        (self.root / "staff.txt").write_text("not for bundle")
        self.build()
        with zipfile.ZipFile(self.output) as z:
            self.assertNotIn("staff.txt", z.namelist())

    def test_drift(self):
        (self.root / b.STAGES["read"][0]).write_text("changed")
        with self.assertRaisesRegex(ValueError, "revision mismatch"):
            self.build()
        self.assertFalse(self.output.exists())

    def test_missing(self):
        (self.root / b.REPORT).unlink()
        with self.assertRaisesRegex(ValueError, "missing"):
            self.build()
        self.assertFalse(self.output.exists())

    def test_output_preserved(self):
        self.output.write_bytes(b"keep")
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.build()
        self.assertEqual(self.output.read_bytes(), b"keep")

    def test_source_symlink(self):
        p = self.root / b.STAGES["read"][0]
        p.unlink()
        other = self.root / "other"
        other.write_bytes(b"synthetic")
        try:
            p.symlink_to(other)
        except (OSError, NotImplementedError):
            self.skipTest("Symlink creation unavailable")
        with self.assertRaisesRegex(ValueError, "Symlink"):
            self.build()
        self.assertFalse(self.output.exists())

    def test_unknown_stage(self):
        with self.assertRaisesRegex(ValueError, "Unknown stage"):
            self.build("all")
        self.assertFalse(self.output.exists())

    def test_archive_manifest(self):
        self.build()
        with zipfile.ZipFile(self.output) as z:
            manifest = json.loads(z.read("bundle-manifest.json"))
            for item in manifest["files"]:
                self.assertEqual(b.blob(z.read(item["member"])), item["git_blob"])


if __name__ == "__main__":
    unittest.main()
