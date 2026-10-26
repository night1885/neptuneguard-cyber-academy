"""Author-only six-attempt loopback CI probe. Not a browser or CLI launch test."""
import http.client
import inspect
import json
import os
import sys
import threading
import unittest
from unittest.mock import patch
import training_site as site

REQUESTS = (("GET", "/"), ("GET", "/exercise/own"),
            ("HEAD", "/exercise/own"), ("GET", "/exercise/other"),
            ("GET", "/exercise/missing"), ("POST", "/exercise/own"))


def run_probe():
    site.require_runtime()
    app = site.TrainingSite()
    server = None
    worker = None
    failures = []
    responses = []
    attempts = 0
    checks = {}
    try:
        server = site.make_server("127.0.0.1", 0, app,
                                  server_class=site.LocalServer,
                                  handler_class=site.QuietHandler)
        if server.server_address[0] != "127.0.0.1" or server.server_address[1] <= 0:
            raise RuntimeError("Unexpected probe bind")
        def serve():
            try:
                server.serve_forever(poll_interval=0.02)
            except BaseException:
                failures.append("server-failure")
        worker = threading.Thread(target=serve, name="training-site-http-probe", daemon=True)
        worker.start()
        for method, path in REQUESTS:
            if attempts >= 6 or server.socket.fileno() < 0:
                raise RuntimeError("Probe contract exceeded or listener closed")
            connection = http.client.HTTPConnection("127.0.0.1", server.server_address[1], timeout=3)
            attempts += 1
            try:
                connection.request(method, path)
                response = connection.getresponse()
                body = response.read(4097)
                if len(body) > 4096:
                    raise RuntimeError("Unexpected probe body size")
                responses.append((response.status, dict((k.lower(), v) for k, v in response.getheaders()), body))
            finally:
                connection.close()
        home, own, head, other, missing, post = responses
        checks = {
            "home_label": home[0] == 200 and b"TRAINING ONLY" in home[2],
            "owner_read": own[0] == 200 and b"FICTIONAL own training text" in own[2],
            "head_metadata": head[0] == 200 and head[2] == b"" and head[1].get("content-length") == str(len(own[2])),
            "denied_missing_match": other[0] == missing[0] == 404 and other[2] == missing[2],
            "denied_no_private_note": b"FICTIONAL OTHER PRIVATE" not in other[2],
            "post_guard": post[0] == 405 and post[1].get("allow") == "GET, HEAD",
            "counts": attempts == app.requests == 6,
        }
    finally:
        try:
            if worker is not None and worker.ident is not None:
                server.shutdown()
                worker.join(timeout=5)
        finally:
            try:
                if server is not None:
                    server.server_close()
            finally:
                app.close()
    checks.update({"listener_closed": server.socket.fileno() == -1,
                   "worker_joined": not worker.is_alive(),
                   "application_closed": app.closed and not app.notes,
                   "no_worker_failure": not failures})
    return {"synthetic": True, "transport": "owned-loopback-http",
            "python": sys.version.split()[0], "effective_uid": os.geteuid(),
            "client_attempts": attempts, "handled": app.requests, "checks": checks}


class GuardTests(unittest.TestCase):
    def test_runtime_rejection_before_bind(self):
        with patch.object(site, "require_runtime", side_effect=RuntimeError("FICTIONAL blocked setup")), patch.object(site, "make_server") as bind:
            with self.assertRaises(RuntimeError):
                run_probe()
            bind.assert_not_called()

    def test_fixed_no_argument_contract(self):
        self.assertEqual(len(REQUESTS), 6)
        self.assertEqual(inspect.signature(run_probe).parameters, {})
        self.assertEqual(REQUESTS, (("GET", "/"), ("GET", "/exercise/own"),
                                   ("HEAD", "/exercise/own"), ("GET", "/exercise/other"),
                                   ("GET", "/exercise/missing"), ("POST", "/exercise/own")))


class TransportTests(unittest.TestCase):
    def test_six_exchanges_and_normal_cleanup(self):
        report = run_probe()
        self.assertNotEqual(report["effective_uid"], 0)
        self.assertEqual((report["client_attempts"], report["handled"]), (6, 6))
        self.assertTrue(all(value is True for value in report["checks"].values()))
        print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
