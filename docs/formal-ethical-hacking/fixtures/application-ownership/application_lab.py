"""Deliberately flawed in-process teaching app. No authentication or network server."""
from dataclasses import dataclass
import json
import sqlite3
import sys
from wsgiref.util import setup_testing_defaults


@dataclass(frozen=True)
class Actor:
    subject_id: str
    role: str
    courses: tuple


ALICE = Actor("student-a", "student", ("course-a",))
BOB = Actor("student-b", "student", ("course-a",))
TEACHER = Actor("teacher-a", "instructor", ("course-a",))


def can_read(actor, note):
    if note["state"] not in ("draft", "submitted") or note["course"] not in actor.courses:
        return False
    if actor.role == "instructor":
        return True
    return actor.role == "student" and note["state"] == "draft"


class DemoApplication:
    def __init__(self, policy):
        self.policy = policy
        self.connection = sqlite3.connect(":memory:")
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("CREATE TABLE notes(id TEXT PRIMARY KEY, owner TEXT, course TEXT, state TEXT, text TEXT)")
        self.connection.executemany("INSERT INTO notes VALUES (?, ?, ?, ?, ?)", [
            ("note-a", "student-a", "course-a", "draft", "FICTIONAL A DRAFT"),
            ("note-b", "student-b", "course-a", "draft", "FICTIONAL B PRIVATE"),
            ("note-c", "student-a", "course-b", "draft", "FICTIONAL OTHER COURSE"),
            ("note-d", "student-a", "course-a", "submitted", "FICTIONAL SUBMITTED"),
        ])

    def close(self):
        self.connection.close()

    def __call__(self, environ, start_response):
        method = environ.get("REQUEST_METHOD")
        def respond(status, payload):
            encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
            headers = [("Content-Type", "application/json; charset=utf-8"), ("Content-Length", str(len(encoded)))]
            if status.startswith("405 "):
                headers.append(("Allow", "GET, HEAD"))
            start_response(status, headers)
            return [] if method == "HEAD" else [encoded]
        if method not in ("GET", "HEAD"):
            return respond("405 Method Not Allowed", {"error": "Method not supported"})
        if environ.get("QUERY_STRING", ""):
            return respond("400 Bad Request", {"error": "Query not supported"})
        path = environ.get("PATH_INFO", "")
        if not isinstance(path, str) or not path.startswith("/notes/"):
            return respond("404 Not Found", {"error": "Not found"})
        key = path[len("/notes/"):]
        if not 1 <= len(key) <= 64 or "/" in key:
            return respond("404 Not Found", {"error": "Not found"})
        actor = environ.get("ng.actor")
        if not isinstance(actor, Actor):
            return respond("403 Forbidden", {"error": "Synthetic actor required"})
        try:
            note = self.connection.execute("SELECT * FROM notes WHERE id = ?", (key,)).fetchone()
        except sqlite3.Error:
            return respond("503 Service Unavailable", {"error": "Teaching dependency unavailable"})
        if note is None or not self.policy(actor, note):
            return respond("404 Not Found", {"error": "Not found"})
        return respond("200 OK", {"note": {"id": note["id"], "text": note["text"]}})


def make_app():
    return DemoApplication(can_read)


def call_app(app, actor, path, method="GET", headers=None, query=""):
    environ = {}
    setup_testing_defaults(environ)
    environ.update({"REQUEST_METHOD": method, "PATH_INFO": path, "QUERY_STRING": query, "ng.actor": actor})
    if headers:
        if not all(isinstance(key, str) and key.startswith("HTTP_") for key in headers):
            raise ValueError("Only fictional HTTP_ fields allowed")
        environ.update(headers)
    observed = []
    def start_response(status, response_headers, exc_info=None):
        observed.append((status, dict(response_headers)))
    body = app(environ, start_response)
    try:
        content = b"".join(body)
    finally:
        if hasattr(body, "close"):
            body.close()
    if len(observed) != 1:
        raise ValueError("Unexpected response count")
    return {"status": observed[0][0], "headers": observed[0][1], "body": content}


def run_demo(factory):
    app = factory()
    try:
        rows = []
        for label, actor, path in [("owner", ALICE, "/notes/note-a"),
                                   ("nonowner", ALICE, "/notes/note-b"),
                                   ("assigned-instructor", TEACHER, "/notes/note-b")]:
            response = call_app(app, actor, path)
            rows.append({"case": label, "status": response["status"],
                         "contains_note": "note" in json.loads(response["body"])})
        boundary_met = (rows[0]["status"] == "200 OK" and rows[0]["contains_note"]
                        and rows[1]["status"] == "404 Not Found" and not rows[1]["contains_note"]
                        and rows[2]["status"] == "200 OK" and rows[2]["contains_note"])
        return {"synthetic": True, "boundary_met": boundary_met, "cases": rows}
    finally:
        app.close()


def main(factory):
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    try:
        report = run_demo(factory)
    except (ValueError, sqlite3.Error):
        print("Teaching demo blocked", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 0 if report["boundary_met"] else 1


if __name__ == "__main__":
    raise SystemExit(main(make_app))
