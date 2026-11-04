"""Maintainer-only offline WP-C packaging; not learner release or execution approval."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

BASELINE = "7ba54b6351638a3a5e3fbcf2416d53b4278109fa"
FIX = "docs/formal-ethical-hacking/fixtures/application-ownership/"
REPORT = "docs/formal-ethical-hacking/authoring/code-review-pathway/INVESTIGATION-REPORT-TEMPLATE.md"
PINS = {
    FIX + "application_lab.py": "828353b64c1340b7311f301d25f7b1303ad86a83",
    FIX + "application_repaired.py": "a0bb23e66156599fe2c4f27480577b884827e8d0",
    FIX + "update_lab.py": "a53a0196b0269abcd05b6e609125cfa04d1c4d77",
    REPORT: "1352812155feafa4116579e7fd37e9e4bacaa714",
}
STAGES = {"read": (FIX + "application_lab.py", REPORT),
          "update": (FIX + "application_lab.py", FIX + "application_repaired.py", FIX + "update_lab.py", REPORT)}


def blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def read_checked(root, relative, expected):
    path = root
    for part in Path(relative).parts:
        path = path / part
        if path.is_symlink():
            raise ValueError("Symlink source rejected")
    if not path.is_file():
        raise ValueError("Required source missing")
    data = path.read_bytes()
    if blob(data) != expected:
        raise ValueError("Source revision mismatch")
    return data


def brief(stage):
    if stage not in STAGES:
        raise ValueError("Unknown stage")
    script = "application_lab.py" if stage == "read" else "update_lab.py"
    members = "\n".join("- " + Path(p).name for p in STAGES[stage])
    text = """# WP-C guided-practice candidate - not released

## Prerequisites and readiness
Read-stage prerequisites remain EH-WEB-01 through EH-WEB-06 concepts plus the existing
offline Python/SQL reading support. The update stage additionally requires the read-ownership
bridge and EH-WEB-08 field-policy concepts. Earlier Linux checks do not replace them.
An approved disposable copy, existing Python with sqlite3/wsgiref, supported launcher,
material transfer, support/recovery contact and private evidence route must be supplied by
the actual brief. Missing requirements mean BLOCKED. Do not install, elevate or reconnect.
This candidate grants no execution, editing, collection or release permission.

## Included files
""" + members + """
- README.md
- bundle-manifest.json

The manifest identifies selected source bytes, not authenticated checkout provenance.
Tests, instructor walkthroughs and the stage's repair solution are intentionally omitted.
Do not run reference/test commands from the full maintainer lesson in this starter-only
bundle or fetch missing files as a workaround. Exclusion is not access control for someone
with repository access. This is guided practice, not an unseen assessment.

## Preserve a prediction first
Read the source and sketch actor/context, selected object, policy and returned information.
Record a legitimate case, a forbidden case, source anchors and an alternative explanation.
For updates, separate object authority, writable fields, revision and transaction outcome.
Preserve the original prediction and record hints/reference exposure.

## Starter observation - only after separate approval
Extract this stage into its own disposable directory; do not overwrite earlier edited work.
From that directory, only on the approved POSIX-style python3 route:

```sh
python3 -B """ + script + """
result=$?
printf 'starter demo status=%s\n' "$result"
```

The deliberate starter is expected to exit 1 with a JSON teaching report. An import,
syntax, dependency or missing-file error is not intended reproduction: stop and report it.
Capture the actual status immediately. The final printf has its own status; -B is not a
sandbox. The report is a selected summary, not complete response-byte or stored-row evidence.
No listener, HTTP client, real account or persistent database is supplied. Use invented data
only; do not deploy these fixtures or import them into academy runtime.

## Repair and reviewer handoff
Propose a narrow repair preserving legitimate behavior. Editing needs its own approved brief.
The later reviewer-led tests are not included; do not claim a repair/retest was executed
without the required files and actual observations. Preserve repository originals and label
PROPOSED / UNATTEMPTED work honestly. Do not weaken expectations or reject every operation.
Use INVESTIGATION-REPORT-TEMPLATE.md as optional draft structure, not a grading or collection
service. Keep read/update findings separate; identify package, prediction, actual result or
blocker, assistance, repair/retest status, uncertainty and final local state.
The actual brief must identify the authorized reviewer/private route and support contact
before collection. No public fallback, invented contact, credentials or unrelated host data.
Preserve files for review until the approved retention/cleanup decision; no broad deletion.
No class certificates, badges, XP or points. Programme certification requires the complete
programme's separately approved requirements, not this task alone.
"""
    if stage == "update":
        text += """
## Read-policy dependency exposure
application_repaired.py is required by the update starter and intentionally exposes the
earlier read repair. It is not the update solution. Record this exposure; subsequent read
work must not be described as unseen or unaided. The update repair remains absent.
"""
    return text


def build(repo, output, stage, *, pins=None):
    if stage not in STAGES:
        raise ValueError("Unknown stage")
    root = Path(repo).resolve(strict=True)
    output = Path(output)
    if output.exists() or output.is_symlink():
        raise ValueError("Output already exists")
    expected = PINS if pins is None else pins
    selected = [(p, read_checked(root, p, expected[p])) for p in STAGES[stage]]
    manifest = {"status": "maintainer-candidate-not-published", "baseline": BASELINE,
                "stage": stage, "read_repair_exposed": stage == "update",
                "verification": "Selected bytes only; HEAD/provenance not authenticated; not adversarial-checkout race protection",
                "files": [{"source": p, "member": Path(p).name, "git_blob": blob(data),
                           "sha256": hashlib.sha256(data).hexdigest()} for p, data in selected]}
    with zipfile.ZipFile(output, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for p, data in selected:
            archive.writestr(Path(p).name, data)
        archive.writestr("README.md", brief(stage))
        archive.writestr("bundle-manifest.json", json.dumps(manifest, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--stage", choices=tuple(STAGES), required=True)
    args = parser.parse_args()
    build(args.repo, args.output, args.stage)


if __name__ == "__main__":
    main()
