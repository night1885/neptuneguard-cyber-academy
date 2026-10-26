"""Visible regression tests for a synthetic in-memory SQLite fixture."""
import unittest
from query_lab import make_database, find_notes


class QueryTests(unittest.TestCase):
    def setUp(self):
        self.db = make_database()
        self.addCleanup(self.db.close)

    def test_exact_owner(self):
        self.assertEqual(find_notes(self.db, "student-a"), [("student-a", "A draft")])

    def test_unknown_owner(self):
        self.assertEqual(find_notes(self.db, "missing"), [])

    def test_empty_owner(self):
        self.assertEqual(find_notes(self.db, ""), [])

    def test_quote_is_data(self):
        self.assertEqual(find_notes(self.db, "O'Neil"), [("O'Neil", "Quoted owner")])

    def test_expression_is_data(self):
        self.assertEqual(find_notes(self.db, "' OR 1=1 -- "), [])


if __name__ == "__main__":
    unittest.main()
