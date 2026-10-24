"""Deliberately PATH-dependent selection of fixed inert helpers. Teaching only; never deploy."""
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

HELPER = "demo-helper"
EXPECTED = "FICTIONAL_TRUSTED\n"
SCRIPTS = {
    "trusted": "#!/bin/sh\nprintf '%s\\n' 'FICTIONAL_TRUSTED'\n",
    "untrusted": "#!/bin/sh\nprintf '%s\\n' 'FICTIONAL_UNTRUSTED'\n",
}


def require_runtime():
    if os.name != "posix" or not Path("/bin/sh").is_file():
        raise RuntimeError("Reviewed POSIX lab required")


def prepare_layout(workspace):
    require_runtime()
    root = Path(workspace)
    if not root.is_dir() or any(root.iterdir()):
        raise ValueError("Expected empty disposable workspace")
    for name, source in SCRIPTS.items():
        folder = root / name
        folder.mkdir(mode=0o700)
        helper = folder / HELPER
        with helper.open("x", encoding="utf-8") as handle:
            handle.write(source)
        helper.chmod(0o700)


def checked_layout(workspace, untrusted_first):
    require_runtime()
    if type(untrusted_first) is not bool:
        raise ValueError("Expected fixed teaching order flag")
    root = Path(workspace).resolve()
    if {path.name for path in root.iterdir()} != set(SCRIPTS):
        raise ValueError("Unexpected layout")
    for name, source in SCRIPTS.items():
        folder = root / name
        helper = folder / HELPER
        if folder.is_symlink() or not folder.is_dir() or {path.name for path in folder.iterdir()} != {HELPER}:
            raise ValueError("Unexpected helper directory")
        if helper.is_symlink() or not helper.is_file() or stat.S_IMODE(helper.stat().st_mode) != 0o700:
            raise ValueError("Unexpected helper file")
        if helper.read_text(encoding="utf-8") != source:
            raise ValueError("Unexpected helper source")
    return root


def launch(root, executable, untrusted_first):
    names = ("untrusted", "trusted") if untrusted_first else ("trusted", "untrusted")
    environment = {"PATH": os.pathsep.join(str(root / name) for name in names)}
    return subprocess.run([executable], shell=False, cwd=root, env=environment,
                          stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=3)


def run_probe(workspace, untrusted_first=False):
    root = checked_layout(workspace, untrusted_first)
    return launch(root, HELPER, untrusted_first)


def run_demo(probe):
    rows = []
    for name, flag in (("trusted-first", False), ("untrusted-first", True)):
        with tempfile.TemporaryDirectory(prefix="ng search ") as work:
            prepare_layout(work)
            result = probe(work, flag)
            rows.append({"case": name, "child_exit": result.returncode,
                         "trusted_selected": result.stdout == EXPECTED,
                         "other_fixed_helper_selected": result.stdout == "FICTIONAL_UNTRUSTED\n"})
    return {"synthetic": True, "all_trusted": all(row["child_exit"] == 0 and row["trusted_selected"] for row in rows), "cases": rows}


def main(probe):
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    try:
        report = run_demo(probe)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        print("Teaching search demo blocked", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 0 if report["all_trusted"] else 1


if __name__ == "__main__":
    raise SystemExit(main(run_probe))
