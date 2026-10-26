"""Check canonical catalogue IDs against simple README lesson links only."""
import json
import posixpath
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ID_PATTERN = r"EH-[A-Z]+-(?:[0-9]{2}|CAPSTONE|PRACTICAL-CAPSTONE)"


def coverage_errors(catalogue, text):
    if not isinstance(catalogue, dict) or not isinstance(text, str):
        return ["catalogue object and README text required"]
    rows = catalogue.get("lessons")
    if not isinstance(rows, list) or not rows:
        return ["nonempty catalogue lessons list required"]
    expected = set()
    errors = []
    for row in rows:
        name = row.get("id") if isinstance(row, dict) else None
        if not isinstance(name, str) or not re.fullmatch(ID_PATTERN, name):
            errors.append("invalid catalogue lesson id")
        elif name in expected:
            errors.append("duplicate catalogue id: " + name)
        else:
            expected.add(name)
    if errors:
        return errors
    text = re.sub(r"(?ms)^```[^\n]*\n.*?^```[ \t]*$", "", text)
    linked = set()
    for target in re.findall(r"(?<!!)\[[^\]]*\]\(([^\s)]+)\)", text):
        try:
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path:
                continue
            path = posixpath.normpath(unquote(url.path))
            match = re.fullmatch(r"lessons/(" + ID_PATTERN + r")\.md", path)
            if match:
                linked.add(match.group(1))
        except ValueError:
            errors.append("invalid link syntax: " + target)
    errors.extend("missing lesson link: " + name for name in sorted(expected - linked))
    errors.extend("uncatalogued lesson link: " + name for name in sorted(linked - expected))
    return errors


def main():
    root = Path(__file__).resolve().parents[1]
    try:
        catalogue = json.loads((root / "curriculum-catalogue.json").read_text(encoding="utf-8"))
        text = (root / "README.md").read_text(encoding="utf-8")
        errors = coverage_errors(catalogue, text)
    except (OSError, UnicodeError, ValueError) as exc:
        errors = ["coverage input could not be read: " + str(exc)]
    for error in errors:
        print(error)
    if not errors:
        print("Canonical catalogue IDs have matching simple README links; no release approval.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
