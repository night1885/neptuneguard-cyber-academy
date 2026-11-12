"""Read-only checks for this assembler's output format, not a publication sanitizer."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import re

BASE = "docs/formal-course-authoring/"
LESSONS = "docs/formal-ethical-hacking/lessons/"
CATALOGUE = "docs/formal-ethical-hacking/curriculum-catalogue.json"
BANNER = "Owner authoring only. Not learner publication, practical permission or completed programme. Source links are displayed as text, not followed."
STYLE = "body{font:17px/1.6 system-ui;max-width:1050px;margin:2rem auto;padding:1rem;background:#151923;color:#edf1f7}a{color:#b8d0ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}section{border-top:1px solid #65718a;margin-top:2rem}a:focus-visible{outline:3px solid #ffd56a}"
FILES = ("ethical-hacking-owner-review.html", "incident-response-owner-review.html", "source-audit.json")

def load(text):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("Duplicate JSON key")
            result[key] = value
        return result
    return json.loads(text, object_pairs_hook=pairs)

def read(root, relative, limit=262144):
    rel = PurePosixPath(relative)
    if rel.is_absolute() or ".." in rel.parts or "\\" in relative or str(rel) != relative:
        raise ValueError("Invalid path")
    path = Path(root)
    if path.is_symlink():
        raise ValueError("Symlink root")
    for part in rel.parts:
        path = path / part
        if path.is_symlink():
            raise ValueError("Symlink file")
    with path.open("rb") as handle:
        raw = handle.read(limit + 1)
    if not raw or len(raw) > limit or b"\0" in raw:
        raise ValueError("File bounds")
    return raw

def record(path, raw):
    return {"path": path, "gitBlob": hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest(), "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}

class Book(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.capture = None
        self.text = []
        self.values = {x: [] for x in ("h2", "pre", "a", "title", "h1", "p", "style")}
        self.ids = []
        self.links = []
        self.doctypes = 0
    def handle_decl(self, decl):
        if decl.lower() != "doctype html" or self.stack or self.doctypes:
            raise ValueError("Unexpected declaration")
        self.doctypes += 1
    def handle_starttag(self, tag, attrs):
        if self.capture or tag not in {"html", "meta", "title", "style", "h1", "p", "ol", "li", "a", "section", "h2", "pre"}:
            raise ValueError("Unexpected/nested markup")
        data = dict(attrs)
        if len(data) != len(attrs):
            raise ValueError("Duplicate attribute")
        if tag == "html":
            valid = data == {"lang": "en"} and not self.stack
        elif tag == "meta":
            valid = data in ({"charset": "utf-8"}, {"name": "viewport", "content": "width=device-width,initial-scale=1"})
        elif tag == "section":
            valid = data == {"id": "s" + str(len(self.ids))}
            self.ids.append(data.get("id"))
        elif tag == "a":
            valid = data == {"href": "#s" + str(len(self.links))} and self.stack[-1:] == ["li"]
            self.links.append(data.get("href"))
        else:
            valid = not data
        if not valid or (tag in ("h2", "pre") and self.stack[-1:] != ["section"]):
            raise ValueError("Unexpected attributes/placement")
        if tag != "meta":
            self.stack.append(tag)
        if tag in self.values:
            self.capture = tag
            self.text = []
    def handle_endtag(self, tag):
        if not self.stack or self.stack.pop() != tag:
            raise ValueError("Unbalanced markup")
        if self.capture:
            if self.capture != tag:
                raise ValueError("Nested capture")
            self.values[tag].append("".join(self.text))
            self.capture = None
    def handle_data(self, text):
        if self.capture:
            self.text.append(text)
        elif text.strip():
            raise ValueError("Unlabelled output text")
    def handle_comment(self, data):
        raise ValueError("Unexpected comment")
    def handle_pi(self, data):
        raise ValueError("Unexpected processing instruction")
    def check(self, title, sections):
        self.close()
        labels = [label for label, _ in sections]
        if self.stack or self.capture or self.doctypes != 1:
            raise ValueError("Incomplete book")
        if self.values != {"h2": labels, "pre": [text for _, text in sections], "a": labels, "title": [title], "h1": [title], "p": [BANNER], "style": [STYLE]} or len(self.ids) != len(sections) or len(self.links) != len(sections):
            raise ValueError("Book projection mismatch")

def verify(root, output):
    root, output = Path(root), Path(output)
    if output.is_symlink() or set(p.name for p in output.iterdir()) != set(FILES):
        raise ValueError("Unexpected output entries")
    manifest = load(read(root, BASE + "manifest.json").decode("utf-8"))
    if manifest["audience"] != "owner-authoring-only" or manifest["publishable"] is not False or manifest["runtimeIntegration"] is not False:
        raise ValueError("Owner-only scope required")
    paths = [CATALOGUE] + [LESSONS + x + ".md" for x in manifest["canonicalIds"]] + [LESSONS + x for x in manifest["supporting"]] + ["soc-analyst.js", BASE + "human-ai-assessment.md", BASE + "incident-evidence-recovery.md"]
    if len(paths) != len(set(paths)):
        raise ValueError("Duplicate source selection")
    raw = {path: read(root, path) for path in paths}
    records = [record(path, raw[path]) for path in paths]
    if sum(x["bytes"] for x in records) > 4194304:
        raise ValueError("Aggregate bounds")
    if records[0]["gitBlob"] != manifest["catalogueGitBlob"] or record("soc-analyst.js", raw["soc-analyst.js"])["gitBlob"] != manifest["socGitBlob"]:
        raise ValueError("Legacy pin mismatch")
    cat = load(raw[CATALOGUE].decode("utf-8"))
    if [x["id"] for x in cat["lessons"]] != manifest["canonicalIds"]:
        raise ValueError("Canonical order mismatch")
    text = {path: data.decode("utf-8") for path, data in raw.items()}
    eh = [(key, text[LESSONS + key + ".md"]) for key in manifest["canonicalIds"]]
    eh += [("Supporting draft: " + key, text[LESSONS + key]) for key in manifest["supporting"]]
    match = re.fullmatch(r"\s*export const SOC_COURSE = (.*?);?\s*", text["soc-analyst.js"], re.S)
    if not match:
        raise ValueError("Standalone SOC data required")
    soc = load(match.group(1).rstrip().removesuffix(";"))
    rows = soc["modules"]
    if soc["key"] != "soc-analyst" or [x["number"] for x in rows] != manifest["socModuleNumbers"]:
        raise ValueError("SOC anchor mismatch")
    keys = ("number", "title", "overview", "learningObjectives", "keyIdeas", "lessonCommands")
    ir = [("Legacy SOC anchor " + str(row["number"]) + ": " + row["title"], json.dumps({key: row[key] for key in keys if key in row}, ensure_ascii=False, indent=2)) for row in rows]
    shared = ("New supporting draft: human and AI assessment", text[BASE + "human-ai-assessment.md"])
    eh.append(shared)
    ir.extend([shared, ("New supporting draft: evidence and recovery", text[BASE + "incident-evidence-recovery.md"])])
    audit = load(read(output, "source-audit.json", 1048576).decode("utf-8"))
    limits = ["Markdown hashes recorded from the checkout, not historical pins.", "Legacy SOC anchors are not a completed formal IR course.", "Generated conversation candidates are not all imported by this change.", "No learner delivery, permissions, progress, grading or deployment implemented."]
    if audit.get("limits") != limits:
        raise ValueError("Audit limitations changed")
    counts = {"canonicalLessonCount": len(manifest["canonicalIds"]), "ethicalReviewSections": len(eh), "legacySocAnchors": len(rows), "incidentReviewSections": len(ir)}
    if audit["sourceBase"] != manifest["sourceBase"] or audit["audience"] != manifest["audience"] or audit["sources"] != records or any(type(audit[k]) is not int or audit[k] != v for k, v in counts.items()):
        raise ValueError("Audit does not match checkout")
    if any(type(row.get("bytes")) is not int for row in audit["sources"]):
        raise ValueError("Audit byte type")
    for name, title, sections in ((FILES[0], "Ethical Hacking source review", eh), (FILES[1], "Incident Response source review - legacy anchors and new drafts", ir)):
        book = Book()
        book.feed(read(output, name, 33554432).decode("utf-8"))
        book.check(title, sections)
    return {"verifiedSources": len(records), **counts, "representationChecksPassed": True, "curriculumQualityAssessed": False, "learnerPublicationAuthorized": False}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    print(json.dumps(verify(Path(__file__).resolve().parents[2], args.output), indent=2))
