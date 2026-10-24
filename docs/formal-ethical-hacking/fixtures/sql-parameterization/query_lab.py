"""Deliberately unsafe offline SQLite exercise. Never use real data."""
import sqlite3


def make_database():
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE notes (owner TEXT, title TEXT)")
    db.executemany(
        "INSERT INTO notes VALUES (?, ?)",
        (("student-a", "A draft"), ("student-b", "B draft"), ("O'Neil", "Quoted owner")),
    )
    return db


def find_notes(db, owner):
    query = "SELECT owner, title FROM notes WHERE owner = '" + owner + "' ORDER BY owner, title"
    return db.execute(query).fetchall()
