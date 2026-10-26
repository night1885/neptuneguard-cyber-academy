"""Deliberately overbroad writable-field policy. In-process teaching only; never deploy."""
import io
import json
import sqlite3
import sys
from wsgiref.util import setup_testing_defaults
from application_lab import Actor, ALICE, BOB, TEACHER, DemoApplication
from application_repaired import can_read

SCHEMA_FIELDS = frozenset(("text", "owner", "course", "state"))


class UpdateApplication(DemoApplication):
    def __init__(self, editable_fields):
        super().__init__(can_read)
        self.editable = frozenset(editable_fields)
        if not self.editable <= SCHEMA_FIELDS:
            self.close()
            raise ValueError("Unexpected fixture field policy")
        self.connection.execute("ALTER TABLE notes ADD COLUMN revision INTEGER NOT NULL DEFAULT 0")
        self.connection.commit()

    def __call__(self, environ, start_response):
        method = environ.get("REQUEST_METHOD")
        def respond(status, payload):
            body = json.dumps(payload, sort_keys=True).encode("utf-8")
            headers = [("Content-Type", "application/json; charset=utf-8"), ("Content-Length", str(len(body)))]
            if status.startswith("405 "):
                headers.append(("Allow", "GET, HEAD, PATCH"))
            start_response(status, headers)
            return [] if method == "HEAD" else [body]
        if method not in ("GET", "HEAD", "PATCH"):
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
            if note is None:
                return respond("404 Not Found", {"error": "Not found"})
            if method in ("GET", "HEAD"):
                if not can_read(actor, note):
                    return respond("404 Not Found", {"error": "Not found"})
            else:
                if not (actor.role == "student" and actor.subject_id == note["owner"]
                        and note["course"] in actor.courses and note["state"] == "draft"):
                    return respond("404 Not Found", {"error": "Not found"})
                if environ.get("CONTENT_TYPE") != "application/json":
                    return respond("415 Unsupported Media Type", {"error": "JSON required"})
                try:
                    length_text = environ.get("CONTENT_LENGTH", "")
                    if not isinstance(length_text, str) or not length_text.isascii() or not length_text.isdigit():
                        raise ValueError("Invalid length")
                    length = int(length_text)
                    if not 1 <= length <= 1024:
                        raise ValueError("Unexpected body size")
                    raw = environ["wsgi.input"].read(length)
                    if len(raw) != length:
                        raise ValueError("Incomplete body")
                    document = json.loads(raw.decode("utf-8"))
                    if not isinstance(document, dict) or not {"text", "expected_revision"} <= set(document):
                        raise ValueError("Unexpected body")
                    fields = sorted(set(document) - {"expected_revision"})
                    if not set(fields) <= self.editable:
                        raise ValueError("Field not editable")
                    if any(not isinstance(document[field], str) or not 1 <= len(document[field]) <= 256 for field in fields):
                        raise ValueError("Unexpected value")
                    for field in fields:
                        document[field].encode("utf-8")
                    if "state" in fields and document["state"] not in ("draft", "submitted"):
                        raise ValueError("Unexpected state")
                    revision = document["expected_revision"]
                    if type(revision) is not int or not 0 <= revision <= 1000000:
                        raise ValueError("Unexpected revision")
                except (ValueError, KeyError, TypeError):
                    return respond("400 Bad Request", {"error": "Invalid teaching update"})
                assignments = ", ".join(field + " = ?" for field in fields)
                values = [document[field] for field in fields]
                with self.connection:
                    changed = self.connection.execute(
                        "UPDATE notes SET " + assignments + ", revision = revision + 1 "
                        "WHERE id = ? AND revision = ? AND owner = ? AND course = ? AND state = 'draft'",
                        values + [key, revision, actor.subject_id, note["course"]])
                if changed.rowcount != 1:
                    return respond("409 Conflict", {"error": "Revision conflict"})
                note = self.connection.execute("SELECT * FROM notes WHERE id = ?", (key,)).fetchone()
            return respond("200 OK", {"note": {"id": note["id"], "text": note["text"], "revision": note["revision"]}})
        except sqlite3.Error:
            return respond("503 Service Unavailable", {"error": "Teaching dependency unavailable"})


def make_app():
    return UpdateApplication(("text", "owner", "course", "state"))


def request(app, actor, path="/notes/note-a", method="GET", document=None, raw=None, headers=None):
    payload = raw if raw is not None else (json.dumps(document).encode("utf-8") if document is not None else b"")
    environ = {}
    setup_testing_defaults(environ)
    environ.update({"REQUEST_METHOD": method, "PATH_INFO": path, "QUERY_STRING": "", "ng.actor": actor,
                    "CONTENT_TYPE": "application/json", "CONTENT_LENGTH": str(len(payload)), "wsgi.input": io.BytesIO(payload)})
    if headers:
        if not all(isinstance(key, str) and key.startswith("HTTP_") for key in headers):
            raise ValueError("Only fictional HTTP_ fields allowed")
        environ.update(headers)
    observed = []
    def start_response(status, response_headers, exc_info=None):
        observed.append((status, dict(response_headers)))
    body = b"".join(app(environ, start_response))
    if len(observed) != 1:
        raise ValueError("Unexpected response count")
    return {"status": observed[0][0], "headers": observed[0][1], "body": body}


def run_demo(factory):
    app = factory()
    try:
        first = request(app, ALICE, method="PATCH", document={"text": "FICTIONAL revision one", "expected_revision": 0})
        stale = request(app, ALICE, method="PATCH", document={"text": "FICTIONAL stale", "expected_revision": 0})
        bad = request(app, ALICE, method="PATCH", document={"text": "FICTIONAL field attempt", "expected_revision": 1, "owner": "student-b"})
        row = app.connection.execute("SELECT owner, text, revision FROM notes WHERE id = ?", ("note-a",)).fetchone()
        return {"synthetic": True, "legitimate_update_succeeded": first["status"] == "200 OK",
                "stale_revision_rejected": stale["status"] == "409 Conflict",
                "server_field_rejected": bad["status"] == "400 Bad Request",
                "owner_preserved": row["owner"] == "student-a",
                "valid_text_preserved": row["text"] == "FICTIONAL revision one", "final_revision": row["revision"]}
    finally:
        app.close()


def main(factory):
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    try:
        report = run_demo(factory)
    except (ValueError, sqlite3.Error):
        print("Teaching update demo blocked", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    expected = all(report[key] for key in ("legitimate_update_succeeded", "stale_revision_rejected", "server_field_rejected", "owner_preserved", "valid_text_preserved"))
    return 0 if expected and report["final_revision"] == 1 else 1


if __name__ == "__main__":
    raise SystemExit(main(make_app))
