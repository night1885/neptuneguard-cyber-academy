import tempfile
import unittest
from pathlib import Path
from check_index import check_links


class LinkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "docs"
        self.root.mkdir()
        (self.root / "lesson.md").write_text("# Synthetic fixture")
        self.outside = self.root.parent / "outside.md"
        self.outside.write_text("Synthetic outside-root fixture")

    def test_existing(self):
        self.assertEqual(check_links(self.root, "[Lesson](lesson.md)"), [])

    def test_missing(self):
        self.assertEqual(len(check_links(self.root, "[Missing](missing.md)")), 1)

    def test_parent_escape(self):
        self.assertEqual(len(check_links(self.root, "[Outside](../outside.md)")), 1)

    def test_absolute(self):
        self.assertEqual(len(check_links(self.root, "[Absolute](" + self.outside.as_posix() + ")")), 1)

    def test_external_and_anchor_ignored(self):
        self.assertEqual(check_links(self.root, "[Web](https://example.invalid/) [Here](#section)"), [])

    def test_file_fragment(self):
        self.assertEqual(check_links(self.root, "[Lesson](lesson.md#not-validated)"), [])

    def test_encoded_escape(self):
        self.assertEqual(len(check_links(self.root, "[Outside](%2e%2e/outside.md)")), 1)

    def test_symlink_escape(self):
        try:
            (self.root / "alias.md").symlink_to(self.outside)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(str(exc))
        self.assertEqual(len(check_links(self.root, "[Alias](alias.md)")), 1)


if __name__ == "__main__":
    unittest.main()
