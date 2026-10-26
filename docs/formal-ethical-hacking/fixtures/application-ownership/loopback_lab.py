"""Short-lived fixed-loopback transport check. Fixed actor is not authentication."""
from contextlib import contextmanager
import http.client
import json
import queue
from socketserver import TCPServer
import sys
import threading
from wsgiref.simple_server import make_server, WSGIServer, WSGIRequestHandler
from application_lab import ALICE
from application_repaired import make_app

HOST = "127.0.0.1"
PATHS = ("/notes/note-a", "/notes/note-b", "/notes/missing")
METHODS = ("GET", "HEAD", "POST")
MAX_REQUESTS = 6


class LoopbackServer(WSGIServer):
    def server_bind(self):
        TCPServer.server_bind(self)
        self.server_name = "localhost"
        self.server_port = self.server_address[1]
        self.setup_environ()

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(3)
        return connection, address


class QuietHandler(WSGIRequestHandler):
    def log_message(self, format, *args):
        pass


class Session:
    def __init__(self, server, worker, stats):
        self.server = server
        self.worker = worker
        self.stats = stats
        self.attempts = 0

    def request(self, method, path, headers=None):
        if method not in METHODS or path not in PATHS or self.attempts >= MAX_REQUESTS:
            raise ValueError("Outside the fixed fixture request contract")
        headers = {} if headers is None else dict(headers)
        if any((key, value) not in (("X-Role", "instructor"), ("X-User", "teacher-a")) for key, value in headers.items()):
            raise ValueError("Use only the fixed fictional header checks")
        if self.server.server_address[0] != HOST or self.server.socket.fileno() < 0:
            raise RuntimeError("Owned listener unavailable")
        self.attempts += 1
        connection = http.client.HTTPConnection(HOST, self.server.server_address[1], timeout=3)
        try:
            connection.request(method, path, headers=headers)
            response = connection.getresponse()
            body = response.read(4097)
            if len(body) > 4096:
                raise ValueError("Unexpected teaching response size")
            return {"status": response.status, "headers": {key.lower(): value for key, value in response.getheaders()}, "body": body}
        finally:
            connection.close()


@contextmanager
def running_fixture():
    ready = queue.Queue()
    failures = []
    stats = {"handled": 0, "database_closed": False}
    def serve():
        app = None
        server = None
        announced = False
        try:
            app = make_app()
            def fixed_actor(environ, start_response):
                stats["handled"] += 1
                environ["ng.actor"] = ALICE
                return app(environ, start_response)
            server = make_server(HOST, 0, fixed_actor, server_class=LoopbackServer, handler_class=QuietHandler)
            if server.server_address[0] != HOST or server.server_address[1] <= 0:
                raise RuntimeError("Unexpected bind")
            ready.put(server)
            announced = True
            server.serve_forever(poll_interval=0.02)
        except Exception:
            if not announced:
                ready.put(None)
            else:
                failures.append("server-failure")
        finally:
            try:
                if server is not None:
                    server.server_close()
            except Exception:
                failures.append("listener-cleanup-failure")
            try:
                if app is not None:
                    app.close()
                    stats["database_closed"] = True
            except Exception:
                failures.append("database-cleanup-failure")
    worker = threading.Thread(target=serve, name="ng-fixed-loopback", daemon=True)
    worker.start()
    try:
        server = ready.get(timeout=5)
    except queue.Empty:
        raise RuntimeError("Teaching fixture startup timed out") from None
    if server is None:
        worker.join(timeout=5)
        raise RuntimeError("Teaching fixture startup failed")
    session = Session(server, worker, stats)
    try:
        yield session
    finally:
        server.shutdown()
        worker.join(timeout=5)
        if worker.is_alive() or failures or server.socket.fileno() >= 0 or not stats["database_closed"]:
            raise RuntimeError("Teaching fixture cleanup unverified")


def run_demo():
    with running_fixture() as session:
        get = session.request("GET", "/notes/note-a")
        head = session.request("HEAD", "/notes/note-a")
        denied = session.request("GET", "/notes/note-b")
        method = session.request("POST", "/notes/note-a")
        checks = {"owner_read": get["status"] == 200 and json.loads(get["body"])["note"]["text"] == "FICTIONAL A DRAFT",
                  "head_metadata": head["status"] == 200 and head["body"] == b"" and head["headers"]["content-length"] == str(len(get["body"])),
                  "denied_body": denied["status"] == 404 and "note" not in json.loads(denied["body"]),
                  "method_guard": method["status"] == 405 and method["headers"].get("allow") == "GET, HEAD"}
    checks.update({"listener_closed": session.server.socket.fileno() == -1,
                   "worker_joined": not session.worker.is_alive(), "database_closed": session.stats["database_closed"]})
    return {"synthetic": True, "transport": "owned-loopback-http", "client_attempts": session.attempts,
            "handled": session.stats["handled"], "checks": checks}


def main():
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    try:
        report = run_demo()
    except (OSError, RuntimeError, ValueError, KeyError, http.client.HTTPException):
        print("Loopback teaching check blocked; inspect approved setup locally", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 0 if all(report["checks"].values()) and report["client_attempts"] == report["handled"] == 4 else 1


if __name__ == "__main__":
    raise SystemExit(main())
