"""Selected real-loopback transport/lifecycle checks, not authentication or isolation tests."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import loopback_lab as lab


class TransportTests(unittest.TestCase):
    def test_owned_bind(self):
        with lab.running_fixture() as session:
            self.assertEqual(session.server.server_address[0], "127.0.0.1")
            self.assertGreater(session.server.server_address[1], 0)

    def test_get(self):
        with lab.running_fixture() as session:
            response = session.request("GET", "/notes/note-a")
            self.assertEqual(response["status"], 200)
            self.assertEqual(json.loads(response["body"])["note"]["text"], "FICTIONAL A DRAFT")
            self.assertEqual(int(response["headers"]["content-length"]), len(response["body"]))

    def test_head(self):
        with lab.running_fixture() as session:
            get = session.request("GET", "/notes/note-a")
            head = session.request("HEAD", "/notes/note-a")
            self.assertEqual(head["body"], b"")
            self.assertEqual(head["headers"]["content-length"], str(len(get["body"])))

    def test_denied_and_absent(self):
        with lab.running_fixture() as session:
            denied = session.request("GET", "/notes/note-b")
            absent = session.request("GET", "/notes/missing")
            self.assertEqual((denied["status"], denied["body"]), (404, absent["body"]))
            self.assertEqual(absent["status"], 404)
            self.assertNotIn(b"FICTIONAL B PRIVATE", denied["body"])

    def test_method(self):
        with lab.running_fixture() as session:
            response = session.request("POST", "/notes/note-a")
            self.assertEqual(response["status"], 405)
            self.assertEqual(response["headers"]["allow"], "GET, HEAD")

    def test_forged_headers(self):
        with lab.running_fixture() as session:
            response = session.request("GET", "/notes/note-b", headers={"X-Role": "instructor", "X-User": "teacher-a"})
            self.assertEqual(response["status"], 404)
            self.assertNotIn(b"FICTIONAL B PRIVATE", response["body"])

    def test_outside_path_no_connection(self):
        with lab.running_fixture() as session, patch("loopback_lab.http.client.HTTPConnection") as client:
            with self.assertRaises(ValueError):
                session.request("GET", "/unreviewed")
            client.assert_not_called()

    def test_budget_no_connection(self):
        with lab.running_fixture() as session, patch("loopback_lab.http.client.HTTPConnection") as client:
            session.attempts = lab.MAX_REQUESTS
            with self.assertRaises(ValueError):
                session.request("GET", "/notes/note-a")
            client.assert_not_called()

    def test_cleanup_state(self):
        with lab.running_fixture() as session:
            session.request("GET", "/notes/note-a")
        self.assertEqual(session.server.socket.fileno(), -1)
        self.assertFalse(session.worker.is_alive())
        self.assertIs(session.stats["database_closed"], True)
        with self.assertRaises(RuntimeError):
            session.request("GET", "/notes/note-a")

    def test_startup_failure(self):
        with patch("loopback_lab.make_app", side_effect=RuntimeError("FICTIONAL setup failure")):
            with self.assertRaises(RuntimeError):
                with lab.running_fixture():
                    self.fail("Startup must not claim ready")


class CliTests(unittest.TestCase):
    def run_cli(self, *arguments):
        script = Path(__file__).with_name("loopback_lab.py").resolve()
        with tempfile.TemporaryDirectory() as work:
            return subprocess.run([sys.executable, "-B", str(script), *arguments], cwd=work,
                                  capture_output=True, text=True, timeout=15)

    def test_report(self):
        result = self.run_cli()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stderr, "")
        self.assertTrue(result.stdout, "Expected JSON report")
        report = json.loads(result.stdout)
        self.assertEqual((report["client_attempts"], report["handled"]), (4, 4))
        self.assertTrue(all(value is True for value in report["checks"].values()))
        self.assertNotIn("FICTIONAL A DRAFT", result.stdout)

    def test_arguments(self):
        result = self.run_cli("extra")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertEqual(result.stderr.strip(), "No arguments accepted")


if __name__ == "__main__":
    unittest.main()
