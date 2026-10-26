"""All fixture paths stay inside a test-owned temporary workspace."""
import tempfile
import unittest
from pathlib import Path
from path_lab import resolve_candidate


class PathTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.workspace = Path(self.temp.name)
        self.base = self.workspace / "allowed"
        self.base.mkdir()
        (self.base / "note.txt").write_text("synthetic")
        (self.base / "nested").mkdir()
        (self.base / "nested" / "note.txt").write_text("synthetic nested")
        self.sibling = self.workspace / "allowed-extra"
        self.sibling.mkdir()
        (self.sibling / "note.txt").write_text("synthetic sibling")
        (self.workspace / "outside.txt").write_text("synthetic outside")

    def test_normal(self):
        self.assertEqual(resolve_candidate(self.base, "note.txt"), (self.base / "note.txt").resolve())

    def test_nested(self):
        self.assertEqual(resolve_candidate(self.base, "nested/note.txt"), (self.base / "nested/note.txt").resolve())

    def test_parent_escape(self):
        with self.assertRaises(ValueError):
            resolve_candidate(self.base, "../outside.txt")

    def test_sibling_prefix(self):
        with self.assertRaises(ValueError):
            resolve_candidate(self.base, "../allowed-extra/note.txt")

    def test_absolute(self):
        with self.assertRaises(ValueError):
            resolve_candidate(self.base, str((self.base / "note.txt").resolve()))

    def test_missing(self):
        with self.assertRaises(FileNotFoundError):
            resolve_candidate(self.base, "missing.txt")

    def test_symlink_to_sibling(self):
        try:
            (self.base / "alias").symlink_to(self.sibling, target_is_directory=True)
        except (OSError, NotImplementedError) as exc:
            self.skipTest("symlink creation unavailable: " + str(exc))
        with self.assertRaises(ValueError):
            resolve_candidate(self.base, "alias/note.txt")


if __name__ == "__main__":
    unittest.main()
