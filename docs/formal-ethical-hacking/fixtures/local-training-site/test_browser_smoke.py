"""Pure input/plan checks. No launcher, Playwright import, browser or sockets."""
import unittest
import browser_smoke as smoke

class GuardTests(unittest.TestCase):
    def test_exact_owned_url(self):
        self.assertEqual(smoke.parse_origin("TRAINING ONLY: http://127.0.0.1:12345/\n"), "http://127.0.0.1:12345")
        for line in ("http://127.0.0.1:12345/\n", "TRAINING ONLY: http://localhost:12345/\n",
                     "TRAINING ONLY: http://127.0.0.1:0/\n", "TRAINING ONLY: http://127.0.0.1:65536/\n",
                     "TRAINING ONLY: http://127.0.0.1:12345/extra\n"):
            with self.subTest(line=line), self.assertRaises(ValueError): smoke.parse_origin(line)

    def test_exact_navigation(self):
        origin = "http://127.0.0.1:12345"
        self.assertTrue(smoke.allowed_navigation(origin, origin+"/", "GET", "document", "/"))
        for url,method,kind,path in ((origin+"/?q=x","GET","document","/"),
                                     (origin+"/","POST","document","/"),
                                     (origin+"/","GET","image","/"),
                                     (origin+"/other","GET","document","/")):
            self.assertFalse(smoke.allowed_navigation(origin,url,method,kind,path))

    def test_bounded_plan(self):
        self.assertEqual((len(smoke.FIRST),len(smoke.SECOND)), (21,4))
        self.assertEqual(smoke.FIRST[:4],smoke.PATHS)
        self.assertTrue(all(path in smoke.PATHS for path in smoke.FIRST+smoke.SECOND))

if __name__ == "__main__": unittest.main()
