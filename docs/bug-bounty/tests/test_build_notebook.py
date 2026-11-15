"""Offline synthetic builder regressions. No live targets or lesson commands."""
import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("course_builder", ROOT / "build-notebook.py")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)
CASES = [('# Heading\n', '### Heading\n'), ('[Read](read-program-brief.md)', '[Read](#lesson-read-program-brief)'), ('`(read-program-brief.md)`', '`(read-program-brief.md)`'), ('literal (read-program-brief.md)', 'literal (read-program-brief.md)'), ('`[Read](read-program-brief.md)`', '`[Read](read-program-brief.md)`'), ('``[Read](read-program-brief.md)``', '``[Read](read-program-brief.md)``'), ('![Image](read-program-brief.md)', '![Image](read-program-brief.md)'), ('[External](https://example.invalid/read-program-brief.md)', '[External](https://example.invalid/read-program-brief.md)'), ('[Unknown](missing.md)', '[Unknown](missing.md)'), ('[Part](read-program-brief.md#outcome)', '[Part](read-program-brief.md#outcome)'), ('```python\n# Keep\nprint("(read-program-brief.md)")\n```\n', '```python\n# Keep\nprint("(read-program-brief.md)")\n```\n'), ('~~~text\n[Read](read-program-brief.md)\n~~~\n', '~~~text\n[Read](read-program-brief.md)\n~~~\n'), ('`multiline\n[Read](read-program-brief.md)\nspan`', '`multiline\n[Read](read-program-brief.md)\nspan`'), ('[Read](./lessons/read-program-brief.md)', '[Read](#lesson-read-program-brief)'), ('`code` [Read](read-program-brief.md)', '`code` [Read](#lesson-read-program-brief)'), ('`a\\` [Read](read-program-brief.md)', '`a\\` [Read](#lesson-read-program-brief)')]


class NotebookTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.repo = Path(cls.temp.name) / "repo"
        cls.repo.mkdir()
        cls.run_git("init", "-q")
        cls.manifest = json.loads((ROOT / "course-manifest.json").read_text())
        cls.slugs = [s for g in cls.manifest["modules"] for s in g["lessons"]]
        cls.lessons = cls.repo / "docs/bug-bounty/lessons"
        cls.lessons.mkdir(parents=True)
        for slug in cls.slugs:
            (cls.lessons / (slug + ".md")).write_text("# Synthetic " + slug + "\n\n```python\n# keep literal\n```\n")
        cls.run_git("add", ".")
        cls.run_git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Synthetic source")
        cls.manifest["source_commit"] = cls.run_git("rev-parse", "HEAD").strip()

    @classmethod
    def run_git(cls, *args):
        r = subprocess.run(["git", "-C", str(cls.repo), *args], capture_output=True, text=True, timeout=30)
        if r.returncode:
            raise AssertionError(r.stderr)
        return r.stdout

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_render_cases(self):
        for source, expected in CASES:
            with self.subTest(source=source):
                self.assertEqual(BUILDER.render(source, self.slugs), expected)

    def test_snapshot_assembly(self):
        text = BUILDER.assemble(self.repo, self.manifest)
        self.assertEqual(text.count('<a id="lesson-'), 44)
        self.assertEqual(text.count("# keep literal"), 44)
        self.assertIn("### Synthetic", text)

    def test_working_tree_ignored(self):
        before = BUILDER.assemble(self.repo, self.manifest)
        file = self.lessons / (self.slugs[-1] + ".md")
        old = file.read_bytes()
        try:
            file.write_text("UNCOMMITTED TEXT")
            self.assertEqual(BUILDER.assemble(self.repo, self.manifest), before)
        finally:
            file.write_bytes(old)

    def test_duplicate_rejected(self):
        bad = copy.deepcopy(self.manifest)
        bad["modules"][0]["lessons"][0] = self.slugs[1]
        with self.assertRaisesRegex(ValueError, "unique"):
            BUILDER.assemble(self.repo, bad)

    def test_inventory_mismatch(self):
        bad = copy.deepcopy(self.manifest)
        bad["modules"][0]["lessons"][0] = "missing-lesson"
        with self.assertRaisesRegex(ValueError, "inventory"):
            BUILDER.assemble(self.repo, bad)

    def test_empty_lesson_rejected(self):
        file = self.lessons / (self.slugs[0] + ".md")
        old = file.read_bytes()
        try:
            file.write_text("")
            self.run_git("add", ".")
            self.run_git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "Empty synthetic lesson")
            bad = copy.deepcopy(self.manifest)
            bad["source_commit"] = self.run_git("rev-parse", "HEAD").strip()
            with self.assertRaisesRegex(ValueError, "Empty lesson"):
                BUILDER.assemble(self.repo, bad)
        finally:
            file.write_bytes(old)

    def test_course_rejected(self):
        bad = copy.deepcopy(self.manifest)
        bad["course"] = "Other"
        with self.assertRaisesRegex(ValueError, "course"):
            BUILDER.assemble(self.repo, bad)

    def test_unpinned_commit_rejected(self):
        bad = copy.deepcopy(self.manifest)
        bad["source_commit"] = "HEAD"
        with self.assertRaisesRegex(ValueError, "pinned"):
            BUILDER.assemble(self.repo, bad)

    def test_unclosed_fence_rejected(self):
        with self.assertRaisesRegex(ValueError, "Unclosed"):
            BUILDER.render("```python\nprint(1)\n", self.slugs)

    def test_cli_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td)
            manifest = path / "manifest.json"
            manifest.write_text(json.dumps(self.manifest))
            output = path / "notebook.md"
            output.write_text("DO NOT OVERWRITE")
            r = subprocess.run([sys.executable, str(ROOT / "build-notebook.py"), "--repo", str(self.repo), "--manifest", str(manifest), "--output", str(output)], capture_output=True, text=True, timeout=30)
            self.assertNotEqual(r.returncode, 0)
            self.assertEqual(output.read_text(), "DO NOT OVERWRITE")


if __name__ == "__main__":
    unittest.main()
