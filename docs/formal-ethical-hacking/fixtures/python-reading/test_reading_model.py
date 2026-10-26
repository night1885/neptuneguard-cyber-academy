import unittest
from dataclasses import FrozenInstanceError
from reading_model import PracticeRun, describe_status, needs_review, summary


class ReadingTests(unittest.TestCase):
    def test_zero_status(self):
        self.assertEqual(describe_status(0), "success")

    def test_nonzero_status(self):
        self.assertEqual(describe_status(7), "nonzero")

    def test_summary_success(self):
        run = PracticeRun("synthetic-check", 0, ("reviewed",))
        self.assertEqual(summary(run), "synthetic-check: success")

    def test_summary_nonzero(self):
        run = PracticeRun("synthetic-check", 7, ("reviewed",))
        self.assertEqual(summary(run), "synthetic-check: nonzero")

    def test_unreviewed_zero(self):
        run = PracticeRun("synthetic-check", 0, ())
        self.assertTrue(needs_review(run))

    def test_reviewed_zero(self):
        run = PracticeRun("synthetic-check", 0, ("reviewed",))
        self.assertFalse(needs_review(run))

    def test_reviewed_nonzero(self):
        run = PracticeRun("synthetic-check", 7, ("reviewed",))
        self.assertTrue(needs_review(run))

    def test_frozen_record(self):
        run = PracticeRun("synthetic-check", 0, ("reviewed",))
        with self.assertRaises(FrozenInstanceError):
            run.status = 7


if __name__ == "__main__":
    unittest.main()
