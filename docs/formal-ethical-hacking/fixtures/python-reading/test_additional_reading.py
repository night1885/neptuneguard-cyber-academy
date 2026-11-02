import unittest
from reading_model import PracticeRun, needs_review, summary


class AdditionalReadingTests(unittest.TestCase):
    def test_nonzero_without_review_tag(self):
        run = PracticeRun("invented-a", 7, ())
        self.assertTrue(needs_review(run))
        self.assertEqual(summary(run), "invented-a: nonzero")

    def test_zero_with_different_tag(self):
        run = PracticeRun("invented-b", 0, ("draft",))
        self.assertTrue(needs_review(run))
        self.assertEqual(summary(run), "invented-b: success")


if __name__ == "__main__":
    unittest.main()
