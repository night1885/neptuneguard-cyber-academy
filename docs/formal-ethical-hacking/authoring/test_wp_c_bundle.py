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


    def test_readme_commands_match_stage_members(self):
        import shlex
        for stage, script in (("read", "application_lab.py"), ("update", "update_lab.py")):
            with self.subTest(stage=stage):
                self.output = self.output.with_name(stage + ".zip")
                self.build(stage)
                with zipfile.ZipFile(self.output) as z:
                    text = z.read("README.md").decode()
                    commands = [shlex.split(line) for line in text.splitlines() if line.startswith("python3 ")]
                    self.assertEqual(commands, [["python3", "-B", script]])
                    self.assertIn(script, z.namelist())
                    self.assertNotIn("-m unittest", text)

    def test_readme_lists_exact_archive_members(self):
        for stage in b.STAGES:
            with self.subTest(stage=stage):
                self.output = self.output.with_name(stage + ".zip")
                self.build(stage)
                with zipfile.ZipFile(self.output) as z:
                    text = z.read("README.md").decode()
                    section = text.split("## Included files\n", 1)[1].split("\n\n", 1)[0]
                    self.assertEqual({line[2:] for line in section.splitlines()}, set(z.namelist()))

    def test_handoff_retains_gates_and_policy(self):
        for stage in ("read", "update"):
            text = b.brief(stage)
            for required in ("EH-WEB-01 through EH-WEB-06", "EH-WEB-08", "BLOCKED",
                             "expected to exit 1", "later reviewer-led tests are not included",
                             "PROPOSED / UNATTEMPTED", "do not overwrite earlier edited work",
                             "No class certificates, badges, XP or points", "Programme certification"):
                self.assertIn(required, text)

    def test_exposure_notice_only_in_update(self):
        self.assertNotIn("## Read-policy dependency exposure", b.brief("read"))
        self.assertIn("## Read-policy dependency exposure", b.brief("update"))
        with self.assertRaisesRegex(ValueError, "Unknown stage"):
            b.brief("all")

    def test_repair_members_and_exposure(self):
        cases = {
            "read-repair": {"application_lab.py", "test_application.py"},
            "update-repair": {"application_lab.py", "application_repaired.py", "update_lab.py", "test_updates.py"},
        }
        for stage, files in cases.items():
            with self.subTest(stage=stage):
                self.output = self.output.with_name(stage + ".zip")
                manifest = self.build(stage)
                with zipfile.ZipFile(self.output) as z:
                    self.assertEqual(set(z.namelist()), files | {"README.md", "bundle-manifest.json", "INVESTIGATION-REPORT-TEMPLATE.md"})
                self.assertEqual(manifest["read_repair_exposed"], stage == "update-repair")

    def test_repair_commands_use_included_contract(self):
        import shlex
        for stage, module in (("read-repair", "test_application"), ("update-repair", "test_updates")):
            with self.subTest(stage=stage):
                self.output = self.output.with_name(stage + ".zip")
                self.build(stage)
                with zipfile.ZipFile(self.output) as z:
                    text = z.read("README.md").decode()
                    commands = [shlex.split(line) for line in text.splitlines() if line.startswith("python3 ")]
                    self.assertEqual(commands, [["python3", "-B", "-m", "unittest", "-v", module]])
                    self.assertIn(module + ".py", z.namelist())

    def test_repair_stage_excludes_cli_and_solutions(self):
        for stage in ("read-repair", "update-repair"):
            self.output = self.output.with_name(stage + ".zip")
            self.build(stage)
            with zipfile.ZipFile(self.output) as z:
                for excluded in ("test_cli.py", "test_update_cli.py", "test_reference.py", "test_update_reference.py", "update_repaired.py", "loopback_lab.py"):
                    self.assertNotIn(excluded, z.namelist())
                if stage == "read-repair":
                    self.assertNotIn("application_repaired.py", z.namelist())

    def test_repair_contract_drift_rejected(self):
        for stage, module in (("read-repair", "test_application"), ("update-repair", "test_updates")):
            self.output = self.output.with_name(stage + ".zip")
            p = self.root / (b.FIX + module + ".py")
            p.write_text("changed")
            with self.assertRaisesRegex(ValueError, "revision mismatch"):
                self.build(stage)
            self.assertFalse(self.output.exists())

    def test_repair_gate_and_unchanged_expectations(self):
        for stage in ("read-repair", "update-repair"):
            text = b.brief(stage)
            for required in ("BLOCKED", "EH-WEB-01 through EH-WEB-06", "EH-WEB-08", "SAME command", "unchanged", "not enforced", "PROPOSED / UNATTEMPTED", "No class certificates, badges, XP or points", "Programme certification"):
                self.assertIn(required, text)

    def test_reviewed_contract_pins(self):
        self.assertEqual(b.PINS[b.FIX + "test_application.py"], "06532c5c90e06061722a02380ec39b3fb08fe1c8")
        self.assertEqual(b.PINS[b.FIX + "test_updates.py"], "3d635596bbb05292a39dacb354abe4256eb3b15c")

    def test_repair_status_capture_is_one_line(self):
        for stage in ("read-repair", "update-repair"):
            self.assertIn("printf 'contract test status=%s\\n' \"$result\"", b.brief(stage))

if __name__ == "__main__":
    unittest.main()
