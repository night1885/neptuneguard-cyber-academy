"""Selected file-decoding and CLI contracts; no network or policy evaluation."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import summarize_observations as target

FIXTURE = Path(__file__).with_name("observations.json")
DUPLICATE_ERROR = "Repeated JSON member name"


class DecodingTests(unittest.TestCase):
    def read_text(self, text):
        with tempfile.TemporaryDirectory() as work:
            path = Path(work) / "synthetic.json"
            path.write_text(text, encoding="utf-8")
            return target.load_records(path)

    def reject_duplicate(self, text):
        with self.assertRaisesRegex(ValueError, "^" + DUPLICATE_ERROR + "$"):
            self.read_text(text)

    def test_conflicting_root_member(self):
        self.reject_duplicate('{"synthetic":false,"synthetic":true,"records":[]}')

    def test_equal_root_member(self):
        self.reject_duplicate('{"synthetic":true,"synthetic":true,"records":[]}')

    def test_repeated_records_member(self):
        self.reject_duplicate('{"synthetic":true,"records":[],"records":[]}')

    def test_conflicting_record_method(self):
        self.reject_duplicate('{"synthetic":true,"records":[{"id":"B01","method":"POST","method":"GET","http_status":200,"client_exit":0}]}')

    def test_equal_record_status(self):
        self.reject_duplicate('{"synthetic":true,"records":[{"id":"B01","method":"GET","http_status":200,"http_status":200,"client_exit":0}]}')

    def test_escaped_member_name_collision(self):
        self.reject_duplicate(r'{"synthetic":false,"synthet\u0069c":true,"records":[]}')

    def test_conflicting_record_id_member(self):
        self.reject_duplicate('{"synthetic":true,"records":[{"id":"bad-label","id":"B01","method":"GET","http_status":200,"client_exit":0}]}')

    def test_duplicate_detected_before_shape_validation(self):
        self.reject_duplicate('{"synthetic":true,"synthetic":false,"records":[]}')

    def test_unique_empty_document(self):
        self.assertEqual(self.read_text('{"synthetic":true,"records":[]}'), ())

    def test_reviewed_fixture_summary_unchanged(self):
        report = target.summarize(target.load_records(FIXTURE))
        self.assertEqual(report, {"synthetic": True, "record_count": 8,
            "status_groups": {"1xx": 1, "2xx": 3, "3xx": 1, "4xx": 1, "5xx": 1, "not-recorded": 1},
            "nonzero_client_exits": 2})

    def test_same_names_in_separate_records_allowed(self):
        records = [{"id": label, "method": "GET", "http_status": 200, "client_exit": 0}
                   for label in ("B01", "B02")]
        self.assertEqual(len(self.read_text(json.dumps({"synthetic": True, "records": records}))), 2)

    def test_member_order_does_not_change_validity(self):
        self.assertEqual(self.read_text(' { "records" : [], "synthetic" : true } '), ())

    def test_names_remain_case_sensitive_and_shape_checked(self):
        with self.assertRaisesRegex(ValueError, "^Unexpected document shape$"):
            self.read_text('{"synthetic":true,"Synthetic":false,"records":[]}')

    def test_predecoded_dictionary_has_no_member_history(self):
        parsed = json.loads('{"synthetic":false,"synthetic":true,"records":[]}')
        self.assertEqual(target.validate_document(parsed), ())


class CliDecodingTests(unittest.TestCase):
    def run_copy(self, raw, arguments=()):
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            package = root / "package"
            package.mkdir()
            script = package / "summarize_observations.py"
            script.write_bytes(Path(target.__file__).read_bytes())
            (package / "observations.json").write_bytes(raw)
            cwd = root / "unrelated"
            cwd.mkdir()
            return subprocess.run([sys.executable, "-B", str(script), *arguments],
                                  cwd=cwd, capture_output=True, text=True, timeout=5)

    def test_duplicate_cli_has_fixed_non_echoing_failure(self):
        marker = "FICTIONAL_DO_NOT_ECHO"
        raw = ('{"synthetic":"' + marker + '","synthetic":true,"records":[]}').encode()
        result = self.run_copy(raw)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "Teaching data rejected; inspect the reviewed fixture locally\n")
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_valid_cli_from_unrelated_directory(self):
        result = self.run_copy(FIXTURE.read_bytes())
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, "")
        self.assertEqual(json.loads(result.stdout), target.summarize(target.load_records(FIXTURE)))

    def test_extra_argument_rejected_without_echo(self):
        marker = "FICTIONAL_UNUSED_ARGUMENT"
        result = self.run_copy(FIXTURE.read_bytes(), (marker,))
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr, "No arguments accepted\n")
        self.assertNotIn(marker, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
