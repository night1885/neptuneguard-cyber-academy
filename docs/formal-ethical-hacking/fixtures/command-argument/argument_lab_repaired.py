"""Repaired reference: argument list, no shell interpretation. Teaching only."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

LABELS = ("demo", "lesson with spaces", "demo; printf FICTIONAL_MARKER > proof.txt")
WORKER = ("import json, sys\n"
          "if len(sys.argv) != 2:\n"
          "    print('Expected one label', file=sys.stderr)\n"
          "    raise SystemExit(2)\n"
          "print(json.dumps({'label': sys.argv[1]}))\n")


def require_runtime():
    if os.name != "posix" or not Path("/bin/sh").is_file():
        raise RuntimeError("Reviewed POSIX lab required")


def prepare_workspace(workspace):
    require_runtime()
    root = Path(workspace)
    if not root.is_dir() or any(root.iterdir()):
        raise ValueError("Expected empty disposable workspace")
    with (root / "worker.py").open("x", encoding="utf-8") as handle:
        handle.write(WORKER)


def run_label(label, workspace):
    require_runtime()
    if not isinstance(label, str) or label not in LABELS:
        raise ValueError("Use only the fixed teaching labels")
    root = Path(workspace).resolve()
    if {path.name for path in root.iterdir()} != {"worker.py"}:
        raise ValueError("Expected clean prepared workspace")
    worker = root / "worker.py"
    if worker.read_text(encoding="utf-8") != WORKER:
        raise ValueError("Unexpected worker source")
    args = [sys.executable, "-I", "-B", str(worker), label]
    return subprocess.run(args, shell=False, cwd=root, stdin=subprocess.DEVNULL,
                          capture_output=True, text=True, timeout=3)


def run_demo():
    cases = []
    for name, label in zip(("plain", "spaces", "instruction-text"), LABELS):
        with tempfile.TemporaryDirectory(prefix="ng-arguments-") as work:
            root = Path(work)
            prepare_workspace(root)
            result = run_label(label, root)
            try:
                observed = json.loads(result.stdout)["label"]
            except (ValueError, KeyError, TypeError):
                observed = None
            marker = root / "proof.txt"
            cases.append({"case": name, "child_exit": result.returncode,
                          "label_preserved": observed == label, "marker_created": marker.exists()})
    violations = sum(row["child_exit"] != 0 or not row["label_preserved"] or row["marker_created"] for row in cases)
    return {"synthetic": True, "cases": cases, "boundary_violations": violations}


def main():
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    try:
        report = run_demo()
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError):
        print("Teaching run blocked; inspect the approved setup locally", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 1 if report["boundary_violations"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
