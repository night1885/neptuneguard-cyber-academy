"""Owner-authoring source assembly only. Never imports teaching code or starts services."""
import argparse
import hashlib
import html
import json
from pathlib import Path,PurePosixPath
import re

HERE=Path(__file__).resolve().parent
LESSONS="docs/formal-ethical-hacking/lessons/"

def strict_json(text):
    def pairs(items):
        result={}
        for key,value in items:
            if key in result:raise ValueError("duplicate JSON key")
            result[key]=value
        return result
    return json.loads(text,object_pairs_hook=pairs)

def blob(raw):return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

def read_source(root,relative,expected=None):
    root=Path(root).resolve();rel=PurePosixPath(relative)
    if rel.is_absolute()or ".."in rel.parts or "\\"in relative or str(rel)!=relative:raise ValueError("invalid source path")
    path=root
    for part in rel.parts:
        path=path/part
        if path.is_symlink():raise ValueError("symlink source refused")
    if not path.resolve().is_relative_to(root)or not path.is_file():raise ValueError("missing/outside source")
    with path.open("rb")as handle:raw=handle.read(262145)
    if not raw or len(raw)>262144 or b"\0"in raw:raise ValueError("source bounds")
    if expected is not None and blob(raw)!=expected:raise ValueError("source pin mismatch")
    text=raw.decode("utf-8")
    if not text.strip():raise ValueError("empty source")
    return text,{"path":relative,"gitBlob":blob(raw),"sha256":hashlib.sha256(raw).hexdigest(),"bytes":len(raw)}

def validate_catalogue(value,expected_ids):
    if not isinstance(value,dict)or value.get("schemaVersion")!=1 or value.get("status")!="draft-not-published"or value.get("publishable")is not False or value.get("runtimeIntegration")is not False or value.get("labDelivery")!="student-built":raise ValueError("draft catalogue required")
    rows=value.get("lessons")
    if not isinstance(rows,list)or not rows or len(rows)>100:raise ValueError("lesson bounds")
    found=[];graph={}
    for row in rows:
        if not isinstance(row,dict)or set(row)!={"id","requires"}or not isinstance(row["id"],str)or not re.fullmatch(r"EH-[A-Z0-9]+(?:-[A-Z0-9]+)*",row["id"]):raise ValueError("lesson shape")
        key=row["id"];req=row["requires"]
        if key in graph or not isinstance(req,list)or any(not isinstance(x,str)for x in req)or len(req)!=len(set(req)):raise ValueError("prerequisite shape")
        found.append(key);graph[key]=req
    if found!=expected_ids:raise ValueError("canonical order changed")
    active=set();done=set()
    def visit(key):
        if key not in graph or key in active:raise ValueError("unknown/cyclic prerequisite")
        if key in done:return
        active.add(key)
        for dep in graph[key]:visit(dep)
        active.remove(key);done.add(key)
    for key in graph:visit(key)
    return rows

def soc_projection(text,expected_numbers):
    match=re.fullmatch(r"\s*export const SOC_COURSE = (.*?);?\s*",text,re.S)
    if not match:raise ValueError("expected standalone SOC JSON literal")
    raw=match.group(1).strip()
    if raw.endswith(";"):raw=raw[:-1].rstrip()
    value=strict_json(raw)
    if not isinstance(value,dict)or value.get("key")!="soc-analyst"or not isinstance(value.get("modules"),list):raise ValueError("SOC source shape")
    rows=value["modules"]
    if any(not isinstance(row,dict)or type(row.get("number"))is not int or not isinstance(row.get("title"),str)for row in rows)or[row["number"]for row in rows]!=expected_numbers:raise ValueError("SOC module order")
    public=("number","title","overview","learningObjectives","keyIdeas","lessonCommands")
    return [{key:row[key]for key in public if key in row}for row in rows]

def render(title,sections):
    heading=html.escape(title)
    nav="".join(f'<li><a href="#s{i}">{html.escape(label)}</a></li>'for i,(label,_)in enumerate(sections))
    body="".join(f'<section id="s{i}"><h2>{html.escape(label)}</h2><pre>{html.escape(text)}</pre></section>'for i,(label,text)in enumerate(sections))
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+heading+'</title><style>body{font:17px/1.6 system-ui;max-width:1050px;margin:2rem auto;padding:1rem;background:#151923;color:#edf1f7}a{color:#b8d0ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}section{border-top:1px solid #65718a;margin-top:2rem}a:focus-visible{outline:3px solid #ffd56a}</style><h1>'+heading+'</h1><p>Owner authoring only. Not learner publication, practical permission or completed programme. Source links are displayed as text, not followed.</p><ol>'+nav+'</ol>'+body+'</html>'

def build(root,manifest):
    if not isinstance(manifest,dict)or set(manifest)!={"schemaVersion","audience","publishable","runtimeIntegration","sourceBase","catalogueGitBlob","socGitBlob","canonicalIds","supporting","socModuleNumbers"}or manifest["schemaVersion"]!=1 or manifest["audience"]!="owner-authoring-only"or manifest["publishable"]is not False or manifest["runtimeIntegration"]is not False:raise ValueError("owner-only manifest required")
    if not isinstance(manifest["sourceBase"],str)or not re.fullmatch(r"[a-f0-9]{40}",manifest["sourceBase"]):raise ValueError("source base shape")
    for key in("catalogueGitBlob","socGitBlob"):
        if not isinstance(manifest[key],str)or not re.fullmatch(r"[a-f0-9]{40}",manifest[key]):raise ValueError("pin shape")
    if not isinstance(manifest["canonicalIds"],list)or not isinstance(manifest["supporting"],list)or len(manifest["supporting"])>30 or len(set(manifest["supporting"]))!=len(manifest["supporting"])or not isinstance(manifest["socModuleNumbers"],list):raise ValueError("manifest lists")
    audit=[]
    def read(path,pin=None):
        text,record=read_source(root,path,pin);audit.append(record);return text
    catalogue=strict_json(read("docs/formal-ethical-hacking/curriculum-catalogue.json",manifest["catalogueGitBlob"]))
    rows=validate_catalogue(catalogue,manifest["canonicalIds"])
    eh=[(row["id"],read(LESSONS+row["id"]+".md"))for row in rows]
    for name in manifest["supporting"]:
        if not isinstance(name,str)or not re.fullmatch(r"[A-Z0-9-]+\.md",name)or any(x in name for x in("INSTRUCTOR","VALIDATION","RUBRIC","ANSWERS")):raise ValueError("invalid supporting source")
        eh.append(("Supporting draft: "+name,read(LESSONS+name)))
    soc=soc_projection(read("soc-analyst.js",manifest["socGitBlob"]),manifest["socModuleNumbers"])
    ir=[("Legacy SOC anchor "+str(row["number"])+": "+row["title"],json.dumps(row,ensure_ascii=False,indent=2))for row in soc]
    shared=read("docs/formal-course-authoring/human-ai-assessment.md")
    eh.append(("New supporting draft: human and AI assessment",shared));ir.append(("New supporting draft: human and AI assessment",shared))
    ir.append(("New supporting draft: evidence and recovery",read("docs/formal-course-authoring/incident-evidence-recovery.md")))
    if sum(row["bytes"]for row in audit)>4194304:raise ValueError("aggregate bounds")
    outputs={"ethical-hacking-owner-review.html":render("Ethical Hacking source review",eh),"incident-response-owner-review.html":render("Incident Response source review - legacy anchors and new drafts",ir)}
    outputs["source-audit.json"]=json.dumps({"sourceBase":manifest["sourceBase"],"audience":manifest["audience"],"canonicalLessonCount":len(rows),"ethicalReviewSections":len(eh),"legacySocAnchors":len(soc),"incidentReviewSections":len(ir),"sources":audit,"limits":["Markdown hashes recorded from the checkout, not historical pins.","Legacy SOC anchors are not a completed formal IR course.","Generated conversation candidates are not all imported by this change.","No learner delivery, permissions, progress, grading or deployment implemented."]},indent=2)+"\n"
    return outputs

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--output",required=True);args=parser.parse_args()
    root=HERE.parents[1];manifest=strict_json((HERE/"manifest.json").read_text(encoding="utf-8"))
    outputs=build(root,manifest);target=Path(args.output);target.mkdir(parents=True,exist_ok=False)
    for name,text in outputs.items():
        with(target/name).open("x",encoding="utf-8")as handle:handle.write(text)
