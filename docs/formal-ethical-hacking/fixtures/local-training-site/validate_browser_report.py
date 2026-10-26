"""Offline browser-report consistency only. Never verifies origin or release readiness."""
import json
from pathlib import Path
import re
import sys

MAX_BYTES = 65536
EXPECTED = ([200,200,404,404] + [200]*16 + [429], [200,200,404,404])


def check_report(report):
    if type(report) is not dict:
        return ["Report must be an object"]
    errors = []
    if report.get("synthetic") is not True or report.get("passed") is not True:
        errors.append("Synthetic successful-run flags required")
    uid = report.get("effective_uid")
    if type(uid) is not int or uid <= 0:
        errors.append("Positive integer non-root UID required")
    if not isinstance(report.get("python"), str) or re.fullmatch(r"3\.12\.[0-9]+", report["python"]) is None:
        errors.append("Expected Python 3.12 patch version")
    if report.get("playwright") != "1.64.1" or not isinstance(report.get("browser"), str) or not report.get("browser", "").strip():
        errors.append("Expected tool pin and nonempty browser version")
    if report.get("browser_channel") != "chrome" or report.get("sandbox_requested") is not True:
        errors.append("Expected Chrome channel and sandbox request")
    if "error_type" in report or "error_message" in report:
        errors.append("Successful report must not contain an error")
    sessions = report.get("sessions")
    if type(sessions) is not list or len(sessions) != 2:
        errors.append("Exactly two ordered sessions required")
        return errors
    for index, (session, statuses) in enumerate(zip(sessions, EXPECTED), 1):
        prefix = "Session " + str(index) + ": "
        if type(session) is not dict:
            errors.append(prefix + "object required")
            continue
        if (type(session.get("planned_gets")) is not int or type(session.get("continued_gets")) is not int
                or session.get("planned_gets") != len(statuses) or session.get("continued_gets") != len(statuses)):
            errors.append(prefix + "fixed planned/continued count mismatch")
        if (type(session.get("statuses")) is not list or session.get("statuses") != statuses
                or any(type(status) is not int for status in session.get("statuses", []))):
            errors.append(prefix + "ordered response statuses mismatch")
        aborted = session.get("aborted_context_requests")
        if type(aborted) is not int or aborted < 0:
            errors.append(prefix + "nonnegative integer aborted-request count required")
        if session.get("sigint_exit_zero") is not True or session.get("forced_cleanup") is not False:
            errors.append(prefix + "normal SIGINT cleanup required")
    return errors


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def invalid_constant(value):
    raise ValueError("Nonstandard JSON constant")


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"consistent":False,"provenance_verified":False,"errors":["Expected one local JSON file path"]}))
        return 2
    try:
        path = Path(sys.argv[1])
        if not path.is_file():
            raise ValueError("Regular local file required")
        with path.open("rb") as source:
            data = source.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Report too large")
        report = json.loads(data.decode("utf-8"), object_pairs_hook=unique_object, parse_constant=invalid_constant)
    except (OSError, ValueError, UnicodeError, RecursionError):
        print(json.dumps({"consistent":False,"provenance_verified":False,"errors":["Report unreadable or invalid"]}))
        return 2
    errors = check_report(report)
    print(json.dumps({"consistent":not errors,"provenance_verified":False,
                      "total_gets":25 if not errors else None,"errors":errors}))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
