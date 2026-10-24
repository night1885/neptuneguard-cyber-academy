"""Check simple inline local links in the draft course README only."""
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit


def check_links(root, text):
    root = Path(root).resolve()
    errors = []
    for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)\)", text):
        url = urlsplit(target)
        if url.scheme or url.netloc or not url.path:
            continue
        path = Path(unquote(url.path))
        if path.is_absolute():
            errors.append("absolute local link: " + target)
            continue
        resolved = (root / path).resolve()
        if not resolved.is_relative_to(root):
            errors.append("link escapes documentation root: " + target)
        elif not resolved.is_file():
            errors.append("missing local file: " + target)
    return errors


def main():
    root = Path(__file__).resolve().parents[1]
    errors = check_links(root, (root / "README.md").read_text(encoding="utf-8"))
    for error in errors:
        print(error)
    if not errors:
        print("Simple README local-file links resolved; no release approval implied.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
