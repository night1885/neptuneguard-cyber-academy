"""Author-only Chromium/CLI smoke check. Two owned sessions; 25 fixed GETs."""
import json
import os
from pathlib import Path
import re
import selectors
import signal
import subprocess
import sys

PATHS = ("/", "/exercise/own", "/exercise/other", "/exercise/missing")
FIRST = PATHS + ("/exercise/own",) * 17
SECOND = PATHS


def parse_origin(line):
    match = re.fullmatch(r"TRAINING ONLY: http://127\.0\.0\.1:([0-9]{1,5})/\n", line)
    if not match or not 1 <= int(match[1]) <= 65535:
        raise ValueError("Unexpected owned CLI URL")
    return "http://127.0.0.1:" + match[1]


def allowed_navigation(origin, url, method, kind, expected):
    return expected in PATHS and method == "GET" and kind == "document" and url == origin + expected


def phase(browser, plan, records):
    record = {"planned_gets": len(plan), "continued_gets": 0, "aborted_context_requests": 0,
              "statuses": [], "sigint_exit_zero": False, "forced_cleanup": False}
    records.append(record)
    process = subprocess.Popen([sys.executable, "-B", str(Path(__file__).with_name("training_site.py"))],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    context = None
    try:
        with selectors.DefaultSelector() as ready:
            ready.register(process.stdout, selectors.EVENT_READ)
            if not ready.select(timeout=8):
                raise RuntimeError("Owned launcher startup timed out")
            origin = parse_origin(process.stdout.readline(512))
        context = browser.new_context(service_workers="block", accept_downloads=False)
        page = context.new_page()
        armed = {"path": None}
        def route_request(route):
            request = route.request
            if (record["continued_gets"] < len(plan) and request.frame == page.main_frame
                    and allowed_navigation(origin, request.url, request.method, request.resource_type, armed["path"])):
                armed["path"] = None
                record["continued_gets"] += 1
                route.continue_()
            else:
                record["aborted_context_requests"] += 1
                route.abort()
        context.route("**/*", route_request)
        for index, path in enumerate(plan):
            armed["path"] = path
            response = page.goto(origin + path, wait_until="load", timeout=5000)
            expected = 429 if index == 20 else 404 if path in PATHS[2:] else 200
            if response is None or response.status != expected:
                raise AssertionError("Unexpected browser response")
            record["statuses"].append(response.status)
            text = page.locator("body").inner_text(timeout=3000)
            if "TRAINING ONLY" not in text or "No login or authentication" not in text:
                raise AssertionError("Missing fictional/authentication labels")
            if expected == 200 and path == "/exercise/own" and "FICTIONAL own training text" not in text:
                raise AssertionError("Own note absent")
            if expected == 404 and "FICTIONAL OTHER PRIVATE" in text:
                raise AssertionError("Other note exposed")
            if expected == 429 and "Budget reached" not in text:
                raise AssertionError("Budget page absent")
        if record["continued_gets"] != len(plan):
            raise AssertionError("Browser request accounting mismatch")
    finally:
        try:
            if context is not None:
                context.close()
        finally:
            try:
                if process.poll() is not None:
                    raise RuntimeError("Owned launcher exited unexpectedly")
                process.send_signal(signal.SIGINT)
                _, errors = process.communicate(timeout=5)
                record["sigint_exit_zero"] = process.returncode == 0 and errors == ""
                if not record["sigint_exit_zero"]:
                    raise RuntimeError("Normal owned CLI shutdown unverified")
            finally:
                if process.poll() is None:
                    record["forced_cleanup"] = True
                    process.kill()
                    process.communicate(timeout=3)


def main():
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    from training_site import require_runtime
    try:
        require_runtime()
    except RuntimeError:
        print("Browser smoke blocked by runtime gate", file=sys.stderr)
        return 2
    report = {"synthetic": True, "passed": False, "python": sys.version.split()[0],
              "effective_uid": os.geteuid(), "browser_channel": "chrome",
              "sandbox_requested": True, "sessions": []}
    try:
        from importlib.metadata import version
        from playwright.sync_api import sync_playwright
        report["playwright"] = version("playwright")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="chrome", headless=True, chromium_sandbox=True, timeout=15000)
            try:
                report["browser"] = browser.version
                phase(browser, FIRST, report["sessions"])
                phase(browser, SECOND, report["sessions"])
            finally:
                browser.close()
        report["passed"] = (sum(s["continued_gets"] for s in report["sessions"]) == 25
                            and all(s["sigint_exit_zero"] and not s["forced_cleanup"] for s in report["sessions"]))
    except Exception as error:
        report["error_type"] = type(error).__name__
        report["error_message"] = str(error)[:1200]
    Path(__file__).with_name("browser-smoke-report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, sort_keys=True))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
