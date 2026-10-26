"""Durable response regressions: in-process only, never a listener."""
import io
import unittest
from unittest.mock import patch
from wsgiref.util import setup_testing_defaults
from wsgiref.validate import validator
import training_site as site

class ResponseTests(unittest.TestCase):
    def call(self, path, method, mode="normal", query="", forged=False):
        app = site.TrainingSite()
        if mode == "closed": app.close()
        elif mode == "exhausted": app.requests = site.MAX_REQUESTS
        elif mode == "escaped":
            app.notes["own"]["title"] = "<b>FICTIONAL</b>"
            app.notes["own"]["text"] = '<script>&" FICTIONAL café'
        env = {}; setup_testing_defaults(env)
        env.update(REQUEST_METHOD=method, PATH_INFO=path, QUERY_STRING=query)
        if forged: env.update(HTTP_X_USER="fictional-learner-b", HTTP_X_ROLE="instructor")
        captured = []; writes = io.BytesIO()
        def start(status, headers, exc_info=None):
            captured.append((int(status[:3]), dict(headers))); return writes.write
        stream = None
        try:
            with patch.object(site, "make_server", side_effect=AssertionError("No listener in regression suite")):
                stream = validator(app)(env, start)
                body = b"".join(stream)
        finally:
            if stream is not None: stream.close()
            app.close()
        self.assertEqual(len(captured), 1); self.assertEqual(writes.getvalue(), b"")
        status, headers = captured[0]
        self.assertEqual(body, b"") if method == "HEAD" else self.assertEqual(int(headers["Content-Length"]), len(body))
        self.assertNotIn(b"FICTIONAL OTHER PRIVATE", body)
        if status == 405: self.assertEqual(headers["Allow"], "GET, HEAD")
        if mode == "escaped" and method == "GET":
            self.assertNotIn(b"<script>", body)
            self.assertIn(b"&lt;script&gt;&amp;&quot;", body)
            self.assertIn(b"&lt;b&gt;FICTIONAL&lt;/b&gt;", body)
            self.assertIn("café".encode(), body)
        return status, headers, body

    def test_35_case_matrix(self):
        cases = []
        for path in ("/", "/exercise/own", "/exercise/other", "/exercise/missing", "/unlisted"):
            for method in ("GET", "HEAD", "POST", "PATCH", "OPTIONS"):
                status = 405 if method not in ("GET", "HEAD") else 200 if path in ("/", "/exercise/own") else 404
                cases.append((path, method, status, {}))
        for method in ("GET", "HEAD"):
            cases.extend([("/", method, 400, {"query":"role=teacher"}),
                          ("/exercise/other", method, 404, {"forged":True})])
        for mode, status in (("closed",503),("exhausted",429),("escaped",200)):
            for method in ("GET", "HEAD"):
                cases.append(("/exercise/own", method, status, {"mode":mode}))
        self.assertEqual(len(cases), 35)
        for path, method, expected, options in cases:
            with self.subTest(path=path, method=method, options=options):
                self.assertEqual(self.call(path, method, **options)[0], expected)

    def test_denial_and_head_invariants(self):
        other = self.call("/exercise/other", "GET")
        missing = self.call("/exercise/missing", "GET")
        self.assertEqual((other[0],other[2]), (missing[0],missing[2]))
        for path, options in (("/",{}),("/exercise/other",{}),("/",{"query":"q=x"}),
                              ("/exercise/own",{"mode":"closed"}),("/exercise/own",{"mode":"exhausted"}),
                              ("/exercise/own",{"mode":"escaped"})):
            with self.subTest(path=path, options=options):
                get = self.call(path,"GET",**options); head = self.call(path,"HEAD",**options)
                self.assertEqual(get[0],head[0]); self.assertEqual(int(head[1]["Content-Length"]),len(get[2]))

if __name__ == "__main__": unittest.main()
