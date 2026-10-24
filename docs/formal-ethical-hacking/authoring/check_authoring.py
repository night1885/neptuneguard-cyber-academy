"""Explicit maintainer checks only; does not discover teaching fixtures."""
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

DOCUMENTS = ("START-HERE.md", "FIRST-PRACTICAL-WORKSHEET.md", "authoring/FIRST-JOURNEY-PILOT.md")
TESTS = ("test_check_index", "test_check_catalogue", "test_sql_shell_example", "test_check_authoring")


def check_documents(root, documents=DOCUMENTS):
    root = Path(root).resolve()
    errors = []
    for relative in documents:
        source = (root / relative).resolve()
        if not source.is_relative_to(root) or not source.is_file():
            errors.append("missing or out-of-root document: " + relative)
            continue
        for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)\)", source.read_text(encoding="utf-8")):
            try:
                url = urlsplit(target)
                if url.scheme or url.netloc or not url.path:
                    continue
                path = Path(unquote(url.path))
                resolved = (source.parent / path).resolve()
                if path.is_absolute() or not resolved.is_relative_to(root):
                    errors.append(relative + ": out-of-root link: " + target)
                elif not resolved.is_file():
                    errors.append(relative + ": missing local file: " + target)
            except ValueError:
                errors.append(relative + ": invalid link: " + target)
    return errors


def run_checks(root, runner=None):
    root = Path(root).resolve()
    authoring = root / "authoring"
    runner = runner or subprocess.run
    try:
        failures = check_documents(root)
    except (OSError, UnicodeError) as exc:
        failures = ["document read failed: " + str(exc)]
    commands = (
        ("README links", [sys.executable, "-B", str(authoring / "check_index.py")]),
        ("catalogue", [sys.executable, "-B", str(authoring / "check_catalogue.py")]),
        ("isolated maintainer tests", [sys.executable, "-B", "-m", "unittest", "-v", *TESTS]),
    )
    for label, command in commands:
        print("Checking " + label, flush=True)
        try:
            result = runner(command, cwd=authoring, timeout=60)
            if result.returncode:
                failures.append(label + " failed with status " + str(result.returncode))
        except (OSError, subprocess.TimeoutExpired) as exc:
            failures.append(label + " could not complete: " + str(exc))
    for failure in failures:
        print(failure)
    if not failures:
        print("Selected authoring checks passed; inspect output for skipped tests. No release approval.")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run_checks(Path(__file__).resolve().parents[1]))
