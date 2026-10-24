import unittest
from sql_reading import make_demo_database, titles_in_category


class SQLReadingTests(unittest.TestCase):
    def setUp(self):
        self.connection = make_demo_database()
        self.addCleanup(self.connection.close)

    def test_known_category_and_explicit_order(self):
        self.assertEqual(titles_in_category(self.connection, "foundation"), ["Terminal notes", "HTTP notes"])

    def test_apostrophe_is_literal_data(self):
        self.assertEqual(titles_in_category(self.connection, "learner's notes"), ["Journal"])

    def test_unknown_category(self):
        self.assertEqual(titles_in_category(self.connection, "unknown"), [])

    def test_empty_category(self):
        self.assertEqual(titles_in_category(self.connection, ""), [])

    def test_repeated_select_is_stable(self):
        first = titles_in_category(self.connection, "foundation")
        self.assertEqual(titles_in_category(self.connection, "foundation"), first)

    def test_select_preserves_synthetic_rows(self):
        before = self.connection.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
        titles_in_category(self.connection, "learner's notes")
        after = self.connection.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
        self.assertEqual(before, 3)
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
