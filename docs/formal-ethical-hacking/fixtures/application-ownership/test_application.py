"""Visible in-process boundary requirements. Trusted actors are fictional assumptions."""
import json
import unittest
from wsgiref.validate import validator
import application_lab as lab


class ApplicationTests(unittest.TestCase):
    factory = staticmethod(lab.make_app)

    def setUp(self):
        self.app = self.factory()
        self.addCleanup(self.app.close)

    def request(self, actor, path="/notes/note-a", **options):
        return lab.call_app(self.app, actor, path, **options)

    def test_owner(self):
        response = self.request(lab.ALICE)
        self.assertEqual(response["status"], "200 OK")
        self.assertEqual(json.loads(response["body"])["note"]["text"], "FICTIONAL A DRAFT")

    def test_nonowner(self):
        response = self.request(lab.ALICE, "/notes/note-b")
        self.assertEqual(response["status"], "404 Not Found")
        self.assertNotIn(b"FICTIONAL B PRIVATE", response["body"])

    def test_nonowner_body(self):
        response = self.request(lab.BOB)
        self.assertNotIn(b"FICTIONAL A DRAFT", response["body"])
        self.assertNotIn("note", json.loads(response["body"]))

    def test_instructor(self):
        self.assertEqual(self.request(lab.TEACHER, "/notes/note-b")["status"], "200 OK")

    def test_anonymous(self):
        self.assertEqual(self.request(None)["status"], "403 Forbidden")

    def test_forged_headers_no_actor(self):
        response = self.request(None, headers={"HTTP_X_USER": "teacher-a", "HTTP_X_ROLE": "instructor"})
        self.assertEqual(response["status"], "403 Forbidden")
        self.assertNotIn("note", json.loads(response["body"]))

    def test_forged_header_does_not_change_course(self):
        response = self.request(lab.ALICE, "/notes/note-c", headers={"HTTP_X_ROLE": "instructor"})
        self.assertEqual(response["status"], "404 Not Found")

    def test_other_course(self):
        self.assertEqual(self.request(lab.TEACHER, "/notes/note-c")["status"], "404 Not Found")

    def test_submitted_student(self):
        self.assertEqual(self.request(lab.ALICE, "/notes/note-d")["status"], "404 Not Found")

    def test_submitted_instructor(self):
        self.assertEqual(self.request(lab.TEACHER, "/notes/note-d")["status"], "200 OK")

    def test_unknown_role(self):
        actor = lab.Actor("visitor-a", "visitor", ("course-a",))
        self.assertEqual(self.request(actor)["status"], "404 Not Found")

    def test_head_metadata(self):
        get = self.request(lab.ALICE)
        head = self.request(lab.ALICE, method="HEAD")
        self.assertEqual(head["body"], b"")
        self.assertEqual(head["status"], get["status"])
        self.assertEqual(head["headers"]["Content-Length"], str(len(get["body"])))

    def test_head_nonowner(self):
        response = self.request(lab.ALICE, "/notes/note-b", method="HEAD")
        self.assertEqual(response["status"], "404 Not Found")
        self.assertEqual(response["body"], b"")

    def test_unknown_same_denial(self):
        hidden = self.request(lab.ALICE, "/notes/note-b")
        absent = self.request(lab.ALICE, "/notes/missing")
        self.assertEqual((hidden["status"], hidden["body"]), (absent["status"], absent["body"]))

    def test_parameter_value(self):
        response = self.request(lab.ALICE, "/notes/note-a' OR '1'='1")
        self.assertEqual(response["status"], "404 Not Found")
        self.assertNotIn("note", json.loads(response["body"]))

    def test_method(self):
        response = self.request(lab.ALICE, method="POST")
        self.assertEqual(response["status"], "405 Method Not Allowed")
        self.assertEqual(response["headers"]["Allow"], "GET, HEAD")

    def test_query(self):
        self.assertEqual(self.request(lab.ALICE, query="role=instructor")["status"], "400 Bad Request")

    def test_dependency_error(self):
        self.app.connection.execute("DROP TABLE notes")
        response = self.request(lab.ALICE)
        self.assertEqual(response["status"], "503 Service Unavailable")
        self.assertEqual(json.loads(response["body"]), {"error": "Teaching dependency unavailable"})
        self.assertNotIn(b"SELECT", response["body"])

    def test_response_length(self):
        response = self.request(lab.ALICE)
        self.assertEqual(int(response["headers"]["Content-Length"]), len(response["body"]))

    def test_wsgi_selected_exchange(self):
        response = lab.call_app(validator(self.app), lab.ALICE, "/notes/note-a")
        self.assertEqual(response["status"], "200 OK")


if __name__ == "__main__":
    unittest.main()
