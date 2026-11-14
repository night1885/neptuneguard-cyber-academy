#!/usr/bin/env python3
"""Assemble a private notebook from a pinned local Git snapshot; no network or lesson execution."""
import argparse
import json
import os
import re
import subprocess
from pathlib import Path


def git(repo, *args):
    env = dict(os.environ, GIT_NO_LAZY_FETCH="1", GIT_TERMINAL_PROMPT="0")
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, timeout=30, env=env)
    if result.returncode:
        raise ValueError(result.stderr.decode("utf-8", errors="replace").strip())
    return result.stdout


def render(text, slugs):
    result = []
    fence = None
    for line in text.splitlines(keepends=True):
        marker = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line.rstrip("\r\n"))
        if fence:
            result.append(line)
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= fence[1] and not marker[2].strip():
                fence = None
            continue
        if marker:
            fence = (marker[1][0], len(marker[1]))
            result.append(line)
            continue
        heading = re.match(r"^(#{1,6})([ \t]+.*)$", line.rstrip("\r\n"))
        if heading:
            ending = "\n" if line.endswith("\n") else ""
            line = "#" * min(6, len(heading[1]) + 2) + heading[2] + ending
        for slug in slugs:
            for prefix in ("", "./", "lessons/", "./lessons/"):
                line = line.replace("(" + prefix + slug + ".md)", "(#lesson-" + slug + ")")
        result.append(line)
    if fence:
        raise ValueError("Unclosed Markdown fence")
    return "".join(result)


def assemble(repo, manifest):
    if manifest.get("course") != "Bug Bounty":
        raise ValueError("Unexpected course")
    commit = manifest.get("source_commit", "")
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("A full pinned Git SHA is required")
    groups = manifest["modules"]
    slugs = [slug for group in groups for slug in group["lessons"]]
    if len(slugs) != 44 or len(set(slugs)) != 44:
        raise ValueError("Expected exactly 44 unique lessons")
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) for slug in slugs):
        raise ValueError("Invalid lesson identifier")
    prefix = "docs/bug-bounty/lessons/"
    inventory = git(repo, "ls-tree", "-r", "--name-only", "-z", commit, "--", prefix).decode("utf-8").split("\0")
    actual = {name for name in inventory if name.endswith(".md")}
    expected = {prefix + slug + ".md" for slug in slugs}
    if actual != expected:
        raise ValueError("Snapshot inventory differs from the manifest")
    parts = ["# Bug Bounty\n\nOwner review notebook; not academy delivery or authorization.\n\nSource commit: `" + commit + "`\n\n"]
    parts.append("## Contents\n\n")
    for group in groups:
        parts.append("### " + group["title"] + "\n\n")
        for slug in group["lessons"]:
            parts.append("- [" + slug.replace("-", " ") + "](#lesson-" + slug + ")\n")
        parts.append("\n")
    for group in groups:
        parts.append("## " + group["title"] + "\n\n")
        for slug in group["lessons"]:
            raw = git(repo, "show", commit + ":" + prefix + slug + ".md").decode("utf-8")
            if not raw.strip():
                raise ValueError("Empty lesson: " + slug)
            parts.append('<a id="lesson-' + slug + '"></a>\n\n')
            parts.append("Source: `" + prefix + slug + ".md`\n\n")
            parts.append(render(raw, slugs).rstrip() + "\n\n---\n\n")
    return "".join(parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        text = assemble(args.repo, manifest)
        with args.output.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
    except (ValueError, OSError, KeyError, TypeError, subprocess.TimeoutExpired) as error:
        parser.exit(1, str(error) + "\n")
    print("Built 44 lessons into", args.output)


if __name__ == "__main__":
    main()
