"""Explicit selected-practical maintainer checks. Not CI activation or a security verdict."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

PLAN_PATH = Path(__file__).with_name("practical-checks.json")
COURSE_ROOT = Path(__file__).resolve().parent.parent
EFFECTS = {"offline", "shell-helpers", "loopback"}


def validate_plan(plan):
    required = {"schemaVersion", "status", "runtimeIntegration", "publishable", "checks"}
    if not isinstance(plan, dict) or set(plan) != required:
        raise ValueError("Unexpected plan shape")
    if type(plan["schemaVersion"]) is not int or plan["schemaVersion"] != 1 or plan["status"] != "draft-maintainer-only":
        raise ValueError("Unexpected plan version/status")
    if plan["runtimeIntegration"] is not False or plan["publishable"] is not False:
        raise ValueError("Planning flags must remain false")
    checks = plan["checks"]
    if not isinstance(checks, list) or not 1 <= len(checks) <= 20:
        raise ValueError("Unexpected check collection")
    seen = set()
    for check in checks:
        if not isinstance(check, dict) or set(check) != {"id", "fixture", "selectors", "effects", "expected"}:
            raise ValueError("Unexpected check shape")
        label = check["id"]
        if not isinstance(label, str) or re.fullmatch(r"[a-z][a-z0-9-]{0,63}", label) is None or label in seen:
            raise ValueError("Unexpected check ID")
        seen.add(label)
        if not isinstance(check["fixture"], str) or re.fullmatch(r"fixtures/[a-z][a-z0-9-]{0,63}", check["fixture"]) is None:
            raise ValueError("Unexpected fixture path")
        selectors = check["selectors"]
        if not isinstance(selectors, list) or not 1 <= len(selectors) <= 5 or any(
            not isinstance(value, str) or re.fullmatch(r"test_[A-Za-z0-9_]+(?:\.[A-Za-z_][A-Za-z0-9_]*)*", value) is None for value in selectors
        ):
            raise ValueError("Unexpected named tests")
        if not isinstance(check["effects"], str) or check["effects"] not in EFFECTS:
            raise ValueError("Unexpected effect profile")
        expected = check["expected"]
        if not isinstance(expected, dict) or set(expected) != {"exit", "methods", "failures", "errors", "skipped", "failure_tests"}:
            raise ValueError("Unexpected expectations")
        if any(type(expected[key]) is not int or expected[key] < 0 for key in ("exit", "methods", "failures", "errors", "skipped")):
            raise ValueError("Expected nonnegative true integers")
        names = expected["failure_tests"]
        if not isinstance(names, list) or len(names) != expected["failures"] or any(not isinstance(name, str) or re.fullmatch(r"test_[A-Za-z0-9_]+", name) is None for name in names):
            raise ValueError("Unexpected assertion-failure names")
        if names != sorted(names):
            raise ValueError("Expected sorted failure names")
        if expected["methods"] < 1 or expected["errors"] or expected["skipped"] or expected["exit"] != int(expected["failures"] > 0):
            raise ValueError("Invalid completion/reproduction contract")
    return checks


def select_checks(checks, only=None, shell=False, loopback=False):
    enabled = {"offline"}
    if shell:
        enabled.add("shell-helpers")
    if loopback:
        enabled.add("loopback")
    if only is not None:
        if len(only) != len(set(only)) or not set(only) <= {row["id"] for row in checks}:
            raise ValueError("Unknown or repeated selected ID")
        chosen = [row for row in checks if row["id"] in only]
        if any(row["effects"] not in enabled for row in chosen):
            raise ValueError("Selected effect needs its explicit opt-in")
        return chosen
    return [row for row in checks if row["effects"] in enabled]


def observe(result):
    fields = ("methods", "failures", "failure_tests", "errors", "skipped",
              "expected_failures", "unexpected_successes")
    observed = dict.fromkeys(fields, None)
    observed["exit"] = result.returncode
    text = result.stderr if isinstance(result.stderr, str) else ""
    matches = list(re.finditer(r"(?m)^Ran (\d+) tests? in [^\n]+\n?", text))
    if not matches:
        return observed
    summary = matches[-1]
    observed["methods"] = int(summary.group(1))
    outcome = re.fullmatch(r"(OK|FAILED)(?: \(([^()\r\n]+)\))?", text[summary.end():].strip())
    if outcome is None:
        return observed
    labels = {"failures": "failures", "errors": "errors", "skipped": "skipped",
              "expected failures": "expected_failures", "unexpected successes": "unexpected_successes"}
    counts = dict.fromkeys(labels.values(), 0)
    seen = set()
    if outcome.group(2):
        for part in outcome.group(2).split(","):
            item = re.fullmatch(r"([^=]+)=(\d+)", part.strip())
            if item is None or item.group(1) not in labels or item.group(1) in seen:
                return observed
            seen.add(item.group(1))
            counts[labels[item.group(1)]] = int(item.group(2))
    unsuccessful = counts["failures"] + counts["errors"] + counts["unexpected_successes"]
    if (outcome.group(1) == "OK" and unsuccessful) or (outcome.group(1) == "FAILED" and not unsuccessful):
        return observed
    observed.update(counts)
    prefix = text[:summary.start()]
    headers = re.findall(r"(?m)^FAIL:[^\n]*", prefix)
    names = re.findall(r"(?m)^FAIL:\s+(test_[A-Za-z0-9_]+)", prefix)
    if len(headers) == len(names) == counts["failures"]:
        observed["failure_tests"] = sorted(names)
    if len(re.findall(r"(?m)^ERROR:", prefix)) != counts["errors"]:
        observed["errors"] = None
    return observed


def execute(check, root=COURSE_ROOT, child_runner=subprocess.run):
    root = Path(root).resolve()
    folder = (root / check["fixture"]).resolve()
    try:
        folder.relative_to(root)
    except ValueError:
        return {"id": check["id"], "matched_expected_behavior": False, "blocked": "fixture-escape"}
    if not folder.is_dir():
        return {"id": check["id"], "matched_expected_behavior": False, "blocked": "missing-reviewed-directory"}
    command = [sys.executable, "-B", "-m", "unittest", "-v", *check["selectors"]]
    try:
        result = child_runner(command, cwd=folder, capture_output=True, text=True, timeout=45)
    except (OSError, subprocess.TimeoutExpired):
        return {"id": check["id"], "matched_expected_behavior": False, "blocked": "launch-or-timeout"}
    observed = observe(result)
    expected = dict(check["expected"], expected_failures=0, unexpected_successes=0)
    return {"id": check["id"], "matched_expected_behavior": observed == expected,
            "expected": expected, "observed": observed}


def main(argv=None):
    try:
        checks = validate_plan(json.loads(PLAN_PATH.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        print("Invalid reviewed maintainer plan", file=sys.stderr)
        return 2
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--only", nargs="+", choices=[row["id"] for row in checks])
    parser.add_argument("--include-shell-helpers", action="store_true")
    parser.add_argument("--include-loopback", action="store_true")
    args = parser.parse_args(argv)
    if not args.run:
        if args.only or args.include_shell_helpers or args.include_loopback:
            parser.error("Execution selections require --run")
        print(json.dumps({"status": "listing-only", "runtimeIntegration": False, "publishable": False, "checks": checks}, sort_keys=True))
        return 0
    try:
        selected = select_checks(checks, args.only, args.include_shell_helpers, args.include_loopback)
    except ValueError:
        parser.error("Selected IDs need the reviewed effect opt-ins")
    results = [execute(check) for check in selected]
    print(json.dumps({"status": "selected-check-contracts-only", "runtimeIntegration": False,
                      "publishable": False, "results": results}, sort_keys=True))
    return 0 if results and all(row["matched_expected_behavior"] for row in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
