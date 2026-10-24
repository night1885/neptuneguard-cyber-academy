"""Correct SQL-reading example with synthetic, connection-local data."""
import sqlite3


def make_demo_database():
    connection = sqlite3.connect(":memory:")
    connection.execute(
        "CREATE TABLE notes (note_id INTEGER PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL)"
    )
    connection.executemany(
        "INSERT INTO notes (note_id, title, category) VALUES (?, ?, ?)",
        [(2, "HTTP notes", "foundation"),
         (1, "Terminal notes", "foundation"),
         (3, "Journal", "learner's notes")],
    )
    connection.commit()
    return connection


def titles_in_category(connection, category):
    cursor = connection.execute(
        "SELECT title FROM notes WHERE category = ? ORDER BY note_id",
        (category,),
    )
    return [row[0] for row in cursor.fetchall()]
