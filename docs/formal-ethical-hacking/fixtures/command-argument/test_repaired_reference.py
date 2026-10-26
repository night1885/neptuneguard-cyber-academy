"""Direct checks of the repaired module, without copying over the starter."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import argument_lab_repaired


class RepairedReferenceTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory(prefix="ng-argument-test-")
        self.addCleanup(self.work.cleanup)
        self.root = Path(self.work.name)
        argument_lab_repaired.prepare_workspace(self.root)

    def test_plain_exit(self):
        self.assertEqual(argument_lab_repaired.run_label(argument_lab_repaired.LABELS[0], self.root).returncode, 0)

    def test_plain_label(self):
        result = argument_lab_repaired.run_label(argument_lab_repaired.LABELS[0], self.root)
        self.assertEqual(json.loads(result.stdout)["label"], argument_lab_repaired.LABELS[0])

    def test_spaces_preserved(self):
        result = argument_lab_repaired.run_label(argument_lab_repaired.LABELS[1], self.root)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["label"], argument_lab_repaired.LABELS[1])

    def test_instruction_text_is_literal(self):
        result = argument_lab_repaired.run_label(argument_lab_repaired.LABELS[2], self.root)
        self.assertEqual(json.loads(result.stdout)["label"], argument_lab_repaired.LABELS[2])

    def test_no_marker(self):
        argument_lab_repaired.run_label(argument_lab_repaired.LABELS[2], self.root)
        self.assertFalse((self.root / "proof.txt").exists())

    def test_unknown_label_no_child(self):
        with patch("argument_lab_repaired.subprocess.run") as runner:
            with self.assertRaises(ValueError):
                argument_lab_repaired.run_label("not-approved", self.root)
            runner.assert_not_called()

    def test_nonstring_no_child(self):
        with patch("argument_lab_repaired.subprocess.run") as runner:
            with self.assertRaises(ValueError):
                argument_lab_repaired.run_label(None, self.root)
            runner.assert_not_called()

    def test_changed_worker_no_child(self):
        (self.root / "worker.py").write_text("# changed fixture", encoding="utf-8")
        with patch("argument_lab_repaired.subprocess.run") as runner:
            with self.assertRaises(ValueError):
                argument_lab_repaired.run_label(argument_lab_repaired.LABELS[0], self.root)
            runner.assert_not_called()

    def test_existing_marker_no_child(self):
        (self.root / "proof.txt").write_text("FICTIONAL pre-existing", encoding="utf-8")
        with patch("argument_lab_repaired.subprocess.run") as runner:
            with self.assertRaises(ValueError):
                argument_lab_repaired.run_label(argument_lab_repaired.LABELS[0], self.root)
            runner.assert_not_called()

    def test_prepare_refuses_nonempty(self):
        with self.assertRaises(ValueError):
            argument_lab_repaired.prepare_workspace(self.root)

    def test_plain_stderr(self):
        self.assertEqual(argument_lab_repaired.run_label(argument_lab_repaired.LABELS[0], self.root).stderr, "")

    def test_runtime_gate_no_child(self):
        with patch("argument_lab_repaired.os.name", "nt"), patch("argument_lab_repaired.subprocess.run") as runner:
            with self.assertRaises(RuntimeError):
                argument_lab_repaired.run_label(argument_lab_repaired.LABELS[0], self.root)
            runner.assert_not_called()


if __name__ == "__main__":
    unittest.main()
