"""Visible examples for a narrow title/body update policy."""
import unittest
from update_lab import apply_changes


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.current = {"owner_id": "student-a", "title": "Draft", "body": "Text", "state": "draft", "grade": None}

    def test_legitimate_update(self):
        expected = dict(self.current, title="Revised", body="New text")
        self.assertEqual(apply_changes(self.current, {"title": "Revised", "body": "New text"}), expected)

    def test_empty_update(self):
        self.assertEqual(apply_changes(self.current, {}), self.current)

    def test_source_unchanged(self):
        before = dict(self.current)
        result = apply_changes(self.current, {"title": "Revised"})
        self.assertEqual(self.current, before)
        self.assertIsNot(result, self.current)

    def test_owner_rejected(self):
        with self.assertRaises(ValueError):
            apply_changes(self.current, {"owner_id": "student-b"})

    def test_grade_rejected(self):
        with self.assertRaises(ValueError):
            apply_changes(self.current, {"grade": 100})

    def test_state_rejected(self):
        with self.assertRaises(ValueError):
            apply_changes(self.current, {"state": "approved"})

    def test_mixed_rejected_atomically(self):
        before = dict(self.current)
        with self.assertRaises(ValueError):
            apply_changes(self.current, {"title": "Revised", "grade": 100})
        self.assertEqual(self.current, before)

    def test_unknown_field_rejected(self):
        with self.assertRaises(ValueError):
            apply_changes(self.current, {"future_privilege": True})


if __name__ == "__main__":
    unittest.main()
