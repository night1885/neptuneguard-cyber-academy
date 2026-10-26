import unittest
from check_catalogue_coverage import coverage_errors


class CoverageTests(unittest.TestCase):
    def setUp(self):
        self.catalogue = {"lessons": [{"id": "EH-LAB-00"}]}
        self.link = "[start](lessons/EH-LAB-00.md)"

    def test_complete(self):
        self.assertEqual(coverage_errors(self.catalogue, self.link), [])

    def test_missing(self):
        self.assertEqual(coverage_errors(self.catalogue, ""), ["missing lesson link: EH-LAB-00"])

    def test_prose_is_not_link(self):
        self.assertTrue(coverage_errors(self.catalogue, "Read EH-LAB-00"))

    def test_external_is_not_local_coverage(self):
        self.assertTrue(coverage_errors(self.catalogue, "[start](https://example.invalid/lessons/EH-LAB-00.md)"))

    def test_normalized_encoded_link_with_fragment(self):
        text = "[start](./lessons/%45H-LAB-00.md#outcomes)"
        self.assertEqual(coverage_errors(self.catalogue, text), [])

    def test_duplicate_id(self):
        self.catalogue["lessons"].append({"id": "EH-LAB-00"})
        self.assertTrue(coverage_errors(self.catalogue, self.link))

    def test_malformed_id(self):
        self.catalogue["lessons"] = [{"id": "../other"}]
        self.assertTrue(coverage_errors(self.catalogue, self.link))

    def test_invalid_roots_and_empty_catalogue(self):
        for data in (None, [], {}, {"lessons": []}, {"lessons": [None]}):
            with self.subTest(data=data):
                self.assertTrue(coverage_errors(data, self.link))

    def test_supporting_document_ignored(self):
        text = self.link + " [bridge](lessons/SQL-READING-BRIDGE.md)"
        self.assertEqual(coverage_errors(self.catalogue, text), [])

    def test_unknown_canonical_lesson(self):
        text = self.link + " [extra](lessons/EH-LAB-99.md)"
        self.assertEqual(coverage_errors(self.catalogue, text), ["uncatalogued lesson link: EH-LAB-99"])

    def test_fenced_example_not_coverage(self):
        self.assertTrue(coverage_errors(self.catalogue, "```md\n" + self.link + "\n```\n"))

    def test_image_not_reading_link(self):
        self.assertTrue(coverage_errors(self.catalogue, "!" + self.link))


if __name__ == "__main__":
    unittest.main()
