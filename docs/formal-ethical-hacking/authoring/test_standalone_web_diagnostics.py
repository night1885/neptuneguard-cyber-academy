"""Optional local author checks; no learner grading or sandbox guarantee."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


BASH = shutil.which("bash")
READY = bool(BASH and shutil.which("ls") and shutil.which("cat"))


@unittest.skipUnless(READY, "requires reviewed Bash, ls and cat")
class ShellDiagnosticTests(unittest.TestCase):
    def run_case(self, script, seed=False):
        with tempfile.TemporaryDirectory(prefix="ng-diagnostics-") as directory:
            root = Path(directory)
            if seed:
                (root / "copy.txt").write_text("invented note\n", encoding="utf-8")
            result = subprocess.run(
                [BASH, "--noprofile", "--norc", "-c", script],
                cwd=directory,
                env={"PATH": os.defpath, "LC_ALL": "C"},
                capture_output=True, text=True, timeout=10,
            )
            files = {name: (root / name).read_text(encoding="utf-8")
                     for name in ("listing.txt", "errors.txt", "stream.txt")
                     if (root / name).is_file()}
            return result, files

    def test_separate_streams_and_preserve_status(self):
        result, files = self.run_case(
            "ls -- copy.txt absent.txt > listing.txt 2> errors.txt\n"
            "result=$?\nprintf 'status=%s\\n' \"$result\"\n", seed=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn("copy.txt", files["listing.txt"])
        self.assertNotIn("absent.txt", files["listing.txt"])
        self.assertIn("absent.txt", files["errors.txt"])
        self.assertRegex(result.stdout, r"^status=[1-9][0-9]*\n$")

    def test_append_then_overwrite(self):
        result, files = self.run_case(
            "printf '%s\\n' first > stream.txt\n"
            "printf '%s\\n' second >> stream.txt\ncat -- stream.txt\n"
            "printf '%s\\n' replacement > stream.txt\ncat -- stream.txt\n")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "first\nsecond\nreplacement\n")
        self.assertEqual(files["stream.txt"], "replacement\n")

    def test_pipeline_status(self):
        result, _ = self.run_case(
            "(\nset +o pipefail\nfalse | cat\n"
            "printf 'default=%s\\n' \"$?\"\nset -o pipefail\n"
            "false | cat\nprintf 'pipefail=%s\\n' \"$?\"\n)\n")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "default=0\npipefail=1\n")

    def test_saved_status_survives_later_success(self):
        result, _ = self.run_case(
            "false\nsaved=$?\nprintf '%s\\n' marker\n"
            "later=$?\nprintf 'saved=%s later=%s\\n' \"$saved\" \"$later\"\n")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "marker\nsaved=1 later=0\n")


if __name__ == "__main__":
    unittest.main()
