"""Local repaired-policy training baseline. Fictional data, no login; never deploy."""
from copy import deepcopy
from html import escape
import os
from socketserver import TCPServer
import sys
from wsgiref.simple_server import make_server, WSGIServer, WSGIRequestHandler

HOST = "127.0.0.1"
MAX_REQUESTS = 20
ACTOR = "fictional-learner-a"
SEED = {
    "own": {"owner":ACTOR, "title":"Own fictional note", "text":"FICTIONAL own training text"},
    "other": {"owner":"fictional-learner-b", "title":"Other fictional note", "text":"FICTIONAL OTHER PRIVATE"},
}
ROUTES = {"/exercise/own":"own", "/exercise/other":"other", "/exercise/missing":"missing"}

class TrainingSite:
    def __init__(self):
        self.notes = deepcopy(SEED)
        self.requests = 0
        self.closed = False

    def close(self):
        self.closed = True
        self.notes.clear()

    def __call__(self, environ, start_response):
        method = environ.get("REQUEST_METHOD")
        def respond(status, title, text, navigation=False):
            links = ('<nav><a href="/exercise/own">Own note</a> '
                     '<a href="/exercise/other">Other-note check</a> '
                     '<a href="/exercise/missing">Missing-note check</a></nav>') if navigation else ''
            document = ('<!doctype html><html lang="en"><meta charset="utf-8">'
                        '<title>Fictional training only</title><body><h1>TRAINING ONLY</h1>'
                        '<p>Fixed fictional learner context. No login or authentication.</p>'
                        '<h2>' + escape(title) + '</h2><p>' + escape(text) + '</p>'
                        + links + '<p><a href="/">Training home</a></p></body></html>')
            body = document.encode("utf-8")
            headers = [("Content-Type","text/html; charset=utf-8"),("Content-Length",str(len(body))),
                       ("Cache-Control","no-store"),("X-Content-Type-Options","nosniff"),
                       ("Referrer-Policy","no-referrer"),
                       ("Content-Security-Policy","default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")]
            if status.startswith("405 "):
                headers.append(("Allow","GET, HEAD"))
            start_response(status, headers)
            return [] if method == "HEAD" else [body]
        if self.closed:
            return respond("503 Service Unavailable","Closed","Training session closed.")
        if self.requests >= MAX_REQUESTS:
            return respond("429 Too Many Requests","Budget reached","Stop and restart only under the approved brief.")
        self.requests += 1
        if method not in ("GET","HEAD"):
            return respond("405 Method Not Allowed","Method excluded","Only GET and HEAD are in this baseline.")
        if environ.get("QUERY_STRING", ""):
            return respond("400 Bad Request","Query excluded","No query parameters are supported.")
        path = environ.get("PATH_INFO", "")
        if path == "/":
            return respond("200 OK","Local training baseline","Use only the fixed links. No real accounts or data.", True)
        key = ROUTES.get(path)
        note = self.notes.get(key)
        if note is None or note["owner"] != ACTOR:
            return respond("404 Not Found","Not found","No note available.")
        return respond("200 OK", note["title"], note["text"])

class LocalServer(WSGIServer):
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

def require_runtime():
    uid = getattr(os,"geteuid",None)
    if os.name != "posix" or not callable(uid) or uid() == 0:
        raise RuntimeError("Approved ordinary-user POSIX guest required")

def run_local():
    require_runtime()
    app = TrainingSite()
    server = None
    try:
        server = make_server(HOST,0,app,server_class=LocalServer,handler_class=QuietHandler)
        if server.server_address[0] != HOST or server.server_address[1] <= 0:
            raise RuntimeError("Unexpected training bind")
        print(f"TRAINING ONLY: http://{HOST}:{server.server_address[1]}/", flush=True)
        print("Fixed fictional learner; GET/HEAD only; Ctrl-C to stop. Never expose publicly.", flush=True)
        server.serve_forever(poll_interval=0.1)
    except KeyboardInterrupt:
        return 0
    finally:
        try:
            if server is not None:
                server.server_close()
        finally:
            app.close()

def main():
    if len(sys.argv) != 1:
        print("No arguments accepted",file=sys.stderr)
        return 2
    try:
        return run_local()
    except (OSError,RuntimeError):
        print("Training site blocked; use the approved setup/support route",file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
