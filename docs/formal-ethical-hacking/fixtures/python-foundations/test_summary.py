"""Visible selected checks, not a complete security or platform suite."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from summarize_observations import MAX_BYTES, load_records, status_group, summarize, validate_document

FIXTURE = Path(__file__).with_name("observations.json")


class SummaryTests(unittest.TestCase):
    def setUp(self):
        self.document = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_reviewed_fixture(self):
        self.assertEqual(len(load_records(FIXTURE)), 8)

    def test_summary(self):
        report = summarize(validate_document(self.document))
        self.assertEqual(report, {"synthetic": True, "record_count": 8,
            "status_groups": {"1xx": 1, "2xx": 3, "3xx": 1, "4xx": 1, "5xx": 1, "not-recorded": 1},
            "nonzero_client_exits": 2})

    def test_status_classes(self):
        for value, expected in [(100, "1xx"), (200, "2xx"), (302, "3xx"), (404, "4xx"), (500, "5xx"), (None, "not-recorded")]:
            with self.subTest(value=value):
                self.assertEqual(status_group(value), expected)

    def test_no_input_mutation(self):
        before = copy.deepcopy(self.document)
        summarize(validate_document(self.document))
        self.assertEqual(self.document, before)

    def test_nonfictional_tag(self):
        self.document["synthetic"] = False
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_root_shape(self):
        with self.assertRaises(ValueError):
            validate_document([])

    def test_extra_root_field(self):
        self.document["unexpected"] = "FICTIONAL"
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_extra_record_field(self):
        self.document["records"][0]["unexpected"] = "FICTIONAL"
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_duplicate_id(self):
        self.document["records"][1]["id"] = "A01"
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_bad_id(self):
        self.document["records"][0]["id"] = "bad-label"
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_unknown_method(self):
        self.document["records"][0]["method"] = "POST"
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_boolean_status(self):
        self.document["records"][0]["http_status"] = True
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_boolean_exit(self):
        self.document["records"][0]["client_exit"] = True
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_string_status(self):
        self.document["records"][0]["http_status"] = "200"
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_status_range(self):
        for value in (99, 600):
            with self.subTest(value=value):
                document = copy.deepcopy(self.document)
                document["records"][0]["http_status"] = value
                with self.assertRaises(ValueError):
                    validate_document(document)

    def test_exit_range(self):
        self.document["records"][0]["client_exit"] = 256
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_record_limit(self):
        self.document["records"] = self.document["records"] * 2
        with self.assertRaises(ValueError):
            validate_document(self.document)

    def test_empty_collection(self):
        self.document["records"] = []
        self.assertEqual(summarize(validate_document(self.document))["record_count"], 0)

    def test_byte_limit(self):
        with tempfile.TemporaryDirectory() as work:
            path = Path(work) / "large.json"
            path.write_bytes(b" " * (MAX_BYTES + 1))
            with self.assertRaises(ValueError):
                load_records(path)

    def test_invalid_json(self):
        with tempfile.TemporaryDirectory() as work:
            path = Path(work) / "invalid.json"
            path.write_text("{", encoding="utf-8")
            with self.assertRaises(ValueError):
                load_records(path)


if __name__ == "__main__":
    unittest.main()
