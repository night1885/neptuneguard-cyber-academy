"""Run the trusted lesson shell example with unittest mocked, not fixtures."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which("bash"), "Bash is required for this authoring check")
class SQLShellTests(unittest.TestCase):
    def check_status(self, status):
        lesson = (ROOT / "lessons" / "EH-WEB-05.md").read_text(encoding="utf-8")
        block = lesson.split("```sh\n", 1)[1].split("```", 1)[0]
        mock = 'python3() { [ "$*" = "-m unittest -v test_query_lab" ] || return 99; return %d; }\n' % status
        with tempfile.TemporaryDirectory() as work:
            result = subprocess.run(
                ["bash", "--noprofile", "--norc", "-c", mock + block],
                cwd=work, capture_output=True, text=True, timeout=5,
            )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "test status=%d\n" % status)
        self.assertEqual(result.stderr, "")

    def test_success_status(self):
        self.check_status(0)

    def test_nonzero_status(self):
        self.check_status(7)


if __name__ == "__main__":
    unittest.main()
