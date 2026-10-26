"""Structural checks for authoring metadata only; never grants progression."""
import json
import re
from pathlib import Path


def validate(data, available):
    if not isinstance(data, dict):
        return ["catalogue must be an object"]
    errors = []
    if type(data.get("schemaVersion")) is not int or data["schemaVersion"] != 1:
        errors.append("schemaVersion must be integer 1")
    for key, expected in (("status", "draft-not-published"), ("labDelivery", "student-built")):
        if data.get(key) != expected:
            errors.append("invalid " + key)
    for key in ("runtimeIntegration", "publishable"):
        if data.get(key) is not False:
            errors.append(key + " must be false")
    rows = data.get("lessons")
    if not isinstance(rows, list) or not rows:
        return errors + ["lessons must be a nonempty list"]
    nodes = {}
    for row in rows:
        if not isinstance(row, dict):
            errors.append("lesson must be an object")
            continue
        name, requires = row.get("id"), row.get("requires")
        if not isinstance(name, str) or not re.fullmatch(r"EH-[A-Z]+-(?:[0-9]{2}|CAPSTONE|PRACTICAL-CAPSTONE)", name):
            errors.append("invalid lesson id")
            continue
        if name in nodes:
            errors.append("duplicate id: " + name)
        if not isinstance(requires, list) or any(not isinstance(x, str) for x in requires):
            errors.append("invalid prerequisites: " + name)
            continue
        if len(requires) != len(set(requires)):
            errors.append("duplicate prerequisite: " + name)
        nodes[name] = requires
        if name + ".md" not in available:
            errors.append("missing lesson file: " + name)
    for name, requires in nodes.items():
        for dep in requires:
            if dep not in nodes:
                errors.append("unknown prerequisite: " + name + " -> " + dep)
    if errors:
        return errors
    state = {}

    def visit(name):
        if state.get(name) == 1:
            errors.append("prerequisite cycle at: " + name)
            return
        if state.get(name) == 2:
            return
        state[name] = 1
        for dep in nodes[name]:
            visit(dep)
        state[name] = 2

    for name in nodes:
        visit(name)
    return errors


def main():
    root = Path(__file__).resolve().parents[1]
    data = json.loads((root / "curriculum-catalogue.json").read_text(encoding="utf-8"))
    available = {p.name for p in (root / "lessons").glob("*.md") if p.is_file()}
    errors = validate(data, available)
    for error in errors:
        print(error)
    if not errors:
        print("Draft catalogue structure and prerequisite graph checked; no release approval.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
