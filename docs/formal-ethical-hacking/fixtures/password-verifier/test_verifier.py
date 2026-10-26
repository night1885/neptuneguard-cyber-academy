"""Selected teaching checks, not a cryptographic audit or authentication suite."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import verifier_lab as lab


class VerifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record = lab.make_record(lab.DEMO_PASSWORD)

    def test_record_shape(self):
        self.assertEqual(set(self.record), {"scheme", "iterations", "salt_hex", "digest_hex"})
        salt, digest = lab.parse_record(self.record)
        self.assertEqual((len(salt), len(digest)), (16, 32))

    def test_correct(self):
        self.assertIs(lab.verify(lab.DEMO_PASSWORD, self.record), True)

    def test_wrong(self):
        self.assertIs(lab.verify("FICTIONAL-wrong", self.record), False)

    def test_separate_salt_requests(self):
        with patch("verifier_lab.secrets.token_bytes", side_effect=[b"A" * 16, b"B" * 16]) as rng:
            first = lab.make_record(lab.DEMO_PASSWORD)
            second = lab.make_record(lab.DEMO_PASSWORD)
        self.assertEqual(rng.call_count, 2)
        self.assertNotEqual(first["salt_hex"], second["salt_hex"])
        self.assertNotEqual(first["digest_hex"], second["digest_hex"])

    def test_bad_shape_no_derivation(self):
        with patch("verifier_lab.derive") as kdf:
            self.assertIs(lab.verify(lab.DEMO_PASSWORD, dict(self.record, extra="FICTIONAL")), False)
            kdf.assert_not_called()

    def test_bad_scheme_no_derivation(self):
        with patch("verifier_lab.derive") as kdf:
            self.assertIs(lab.verify(lab.DEMO_PASSWORD, dict(self.record, scheme="other")), False)
            kdf.assert_not_called()

    def test_boolean_iterations(self):
        self.assertIs(lab.verify(lab.DEMO_PASSWORD, dict(self.record, iterations=True)), False)

    def test_parameter_bounds_before_derivation(self):
        for iterations in (0, 1, lab.ITERATIONS - 1, lab.ITERATIONS + 1, 10**12):
            with self.subTest(iterations=iterations), patch("verifier_lab.derive") as kdf:
                self.assertIs(lab.verify(lab.DEMO_PASSWORD, dict(self.record, iterations=iterations)), False)
                kdf.assert_not_called()

    def test_salt_format(self):
        self.assertIs(lab.verify(lab.DEMO_PASSWORD, dict(self.record, salt_hex="bad")), False)

    def test_digest_format(self):
        self.assertIs(lab.verify(lab.DEMO_PASSWORD, dict(self.record, digest_hex="g" * 64)), False)

    def test_bad_password_inputs(self):
        for value in (None, True, "", "x" * 129):
            with self.subTest(value_type=type(value).__name__):
                self.assertIs(lab.verify(value, self.record), False)
                with self.assertRaises(ValueError):
                    lab.make_record(value)

    def test_utf8_contract(self):
        self.assertEqual(lab.password_bytes("FICTIONAL-caf\u00e9"), "FICTIONAL-caf\u00e9".encode("utf-8"))
        with self.assertRaises(ValueError):
            lab.password_bytes("\ud800")

    def test_tampered_digest(self):
        changed = dict(self.record, digest_hex="00" * 32)
        self.assertIs(lab.verify(lab.DEMO_PASSWORD, changed), False)

    def test_comparison_receives_bytes(self):
        with patch("verifier_lab.hmac.compare_digest", wraps=lab.hmac.compare_digest) as comparator:
            self.assertIs(lab.verify(lab.DEMO_PASSWORD, self.record), True)
        comparator.assert_called_once()
        args = comparator.call_args.args
        self.assertTrue(all(isinstance(value, bytes) and len(value) == 32 for value in args))

    def test_missing_kdf_is_operational_error(self):
        with patch("verifier_lab.hashlib.pbkdf2_hmac", None):
            with self.assertRaises(RuntimeError):
                lab.verify(lab.DEMO_PASSWORD, self.record)


class CliTests(unittest.TestCase):
    def run_cli(self, *arguments):
        script = Path(__file__).with_name("verifier_lab.py").resolve()
        with tempfile.TemporaryDirectory() as work:
            return subprocess.run([sys.executable, "-B", str(script), *arguments],
                                  cwd=work, capture_output=True, text=True, timeout=15)

    def test_report(self):
        result = self.run_cli()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, "")
        report = json.loads(result.stdout)
        self.assertEqual(set(report), {"synthetic", "base64_roundtrip", "unsalted_digest_repeats",
            "new_salts_differ", "verifier_records_differ", "correct_password_accepted",
            "wrong_password_rejected", "malformed_record_rejected"})
        self.assertTrue(all(value is True for value in report.values()))
        self.assertNotIn(lab.DEMO_PASSWORD, result.stdout + result.stderr)

    def test_extra_argument(self):
        result = self.run_cli("FICTIONAL_NOT_A_REAL_PASSWORD")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertNotIn("FICTIONAL_NOT_A_REAL_PASSWORD", result.stderr)


if __name__ == "__main__":
    unittest.main()
