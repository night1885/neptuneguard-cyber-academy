"""Selected field/operation/revision requirements; no real authentication or concurrency test."""
import json
import sqlite3
import unittest
import update_lab as lab


class UpdateTests(unittest.TestCase):
    factory = staticmethod(lab.make_app)

    def setUp(self):
        self.app = self.factory()
        self.addCleanup(self.app.close)

    def patch_note(self, actor=lab.ALICE, path="/notes/note-a", **extra):
        document = {"text": "FICTIONAL edited", "expected_revision": 0}
        document.update(extra)
        return lab.request(self.app, actor, path, "PATCH", document=document)

    def row(self):
        return dict(self.app.connection.execute("SELECT * FROM notes WHERE id = ?", ("note-a",)).fetchone())

    def test_read_revision(self):
        response = lab.request(self.app, lab.ALICE)
        self.assertEqual(json.loads(response["body"])["note"]["revision"], 0)

    def test_legitimate_edit(self):
        self.assertEqual(self.patch_note()["status"], "200 OK")
        self.assertEqual((self.row()["text"], self.row()["revision"]), ("FICTIONAL edited", 1))

    def test_nonowner(self):
        self.assertEqual(self.patch_note(lab.BOB)["status"], "404 Not Found")
        self.assertEqual(self.row()["revision"], 0)

    def test_instructor_cannot_edit(self):
        self.assertEqual(self.patch_note(lab.TEACHER)["status"], "404 Not Found")
        self.assertEqual(self.row()["revision"], 0)

    def test_other_course(self):
        self.assertEqual(self.patch_note(path="/notes/note-c")["status"], "404 Not Found")

    def test_submitted(self):
        self.assertEqual(self.patch_note(path="/notes/note-d")["status"], "404 Not Found")

    def test_missing_actor(self):
        self.assertEqual(self.patch_note(None)["status"], "403 Forbidden")

    def test_forged_header(self):
        response = lab.request(self.app, None, method="PATCH", document={"text": "FICTIONAL", "expected_revision": 0}, headers={"HTTP_X_USER": "student-a"})
        self.assertEqual(response["status"], "403 Forbidden")

    def test_owner_field(self):
        self.assertEqual(self.patch_note(owner="student-b")["status"], "400 Bad Request")
        self.assertEqual(self.row()["owner"], "student-a")

    def test_course_field(self):
        self.assertEqual(self.patch_note(course="course-b")["status"], "400 Bad Request")
        self.assertEqual(self.row()["course"], "course-a")

    def test_state_field(self):
        self.assertEqual(self.patch_note(state="submitted")["status"], "400 Bad Request")
        self.assertEqual(self.row()["state"], "draft")

    def test_unknown_field(self):
        self.assertEqual(self.patch_note(grade="A")["status"], "400 Bad Request")

    def test_malformed_json(self):
        response = lab.request(self.app, lab.ALICE, method="PATCH", raw=b"{")
        self.assertEqual(response["status"], "400 Bad Request")
        self.assertEqual(self.row()["revision"], 0)

    def test_missing_revision(self):
        response = lab.request(self.app, lab.ALICE, method="PATCH", document={"text": "FICTIONAL"})
        self.assertEqual(response["status"], "400 Bad Request")

    def test_boolean_revision(self):
        self.assertEqual(self.patch_note(expected_revision=True)["status"], "400 Bad Request")

    def test_negative_revision(self):
        self.assertEqual(self.patch_note(expected_revision=-1)["status"], "400 Bad Request")

    def test_stale_no_overwrite(self):
        self.assertEqual(self.patch_note()["status"], "200 OK")
        self.assertEqual(self.patch_note(text="FICTIONAL stale")["status"], "409 Conflict")
        self.assertEqual((self.row()["text"], self.row()["revision"]), ("FICTIONAL edited", 1))

    def test_body_limit(self):
        response = lab.request(self.app, lab.ALICE, method="PATCH", raw=b" " * 1025)
        self.assertEqual(response["status"], "400 Bad Request")

    def test_nonobject_json(self):
        response = lab.request(self.app, lab.ALICE, method="PATCH", document=[])
        self.assertEqual(response["status"], "400 Bad Request")

    def test_literal_text_not_field(self):
        self.assertEqual(self.patch_note(text="FICTIONAL owner=student-b")["status"], "200 OK")
        self.assertEqual(self.row()["owner"], "student-a")

    def test_head(self):
        get = lab.request(self.app, lab.ALICE)
        head = lab.request(self.app, lab.ALICE, method="HEAD")
        self.assertEqual(head["body"], b"")
        self.assertEqual(head["headers"]["Content-Length"], str(len(get["body"])))

    def test_method_allow(self):
        response = lab.request(self.app, lab.ALICE, method="DELETE")
        self.assertEqual(response["status"], "405 Method Not Allowed")
        self.assertEqual(response["headers"]["Allow"], "GET, HEAD, PATCH")

    def test_dependency_error(self):
        self.app.connection.execute("DROP TABLE notes")
        response = self.patch_note()
        self.assertEqual(response["status"], "503 Service Unavailable")
        self.assertEqual(json.loads(response["body"]), {"error": "Teaching dependency unavailable"})

    def test_sql_like_field_name(self):
        self.assertEqual(self.patch_note(**{"owner = 'student-b'": "FICTIONAL"})["status"], "400 Bad Request")

    def test_unknown_record(self):
        self.assertEqual(self.patch_note(path="/notes/missing")["status"], "404 Not Found")

    def test_invalid_value_encoding(self):
        self.assertEqual(self.patch_note(text="\ud800")["status"], "400 Bad Request")
        self.assertEqual(self.row()["revision"], 0)

    def test_commit_failure_no_success_or_change(self):
        class FailCommit:
            def __init__(self, connection):
                self.connection = connection
            def __getattr__(self, name):
                return getattr(self.connection, name)
            def __enter__(self):
                self.connection.__enter__()
                return self
            def __exit__(self, kind, value, traceback):
                if kind is None:
                    self.connection.rollback()
                    raise sqlite3.OperationalError("FICTIONAL commit failure")
                return self.connection.__exit__(kind, value, traceback)
        self.app.connection = FailCommit(self.app.connection)
        response = self.patch_note()
        self.assertEqual(response["status"], "503 Service Unavailable")
        self.assertEqual((self.row()["text"], self.row()["revision"]), ("FICTIONAL A DRAFT", 0))
        self.assertNotIn(b"FICTIONAL commit failure", response["body"])


if __name__ == "__main__":
    unittest.main()
