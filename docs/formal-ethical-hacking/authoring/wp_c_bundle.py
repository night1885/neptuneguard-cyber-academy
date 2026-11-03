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
    text = """# WP-C guided-practice candidate - not released

Existing prerequisites, approved Python/SQLite setup, material transfer, support and private
evidence handling remain required. This bundle grants no execution or editing permission.
Use invented in-memory actors/records only. No listener, network client or real database is
provided. Stop for missing setup; do not install or reconnect to bypass a blocker.
Preserve predictions; distinguish observed, source-predicted, blocked and unattempted work.
Record help/reference exposure. Keep repository originals unchanged. The existing report
template is optional draft structure, not a grader or evidence-collection service.
No class certificates, badges, XP or points. Programme certification remains a separate
whole-programme decision. No unseen-task or independent-performance claim is established.
Reference omission is not access control against someone with source-repository access.
"""
    if stage == "read":
        return text + "\nTrace the actor, selected record, policy and response in application_lab.py. Preserve an allowed/forbidden prediction and alternative explanation before observations. Propose a narrow repair preserving legitimate behavior. Read repair, tests and instructor walkthroughs are omitted.\n"
    return text + "\nTrace object authority, writable fields, revision, transaction and returned state in update_lab.py. application_repaired.py is its required read-policy dependency: this stage intentionally exposes the earlier read repair. It is NOT an unseen read assessment. Update repair, tests and instructor walkthroughs are omitted.\n"


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
