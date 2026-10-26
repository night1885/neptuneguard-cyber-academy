"""Deliberately flawed offline collection export. Fictional data only; never deploy."""
from copy import deepcopy
from dataclasses import dataclass
import json
import sys

@dataclass(frozen=True)
class Actor:
    subject: str
    role: str
    boards: tuple

LEARNER = Actor("learner-a", "contributor", ("board-a",))
REVIEWER = Actor("reviewer-a", "reviewer", ("board-a",))
SEED = (
    {"id":"R01","owner":"learner-a","board":"board-a","state":"draft","title":"FICTIONAL own plan","shared_read":(),"reviewer_memo":"FICTIONAL INTERNAL ONE"},
    {"id":"R02","owner":"learner-b","board":"board-a","state":"submitted","title":"FICTIONAL submitted plan","shared_read":(),"reviewer_memo":"FICTIONAL INTERNAL TWO"},
    {"id":"R03","owner":"learner-a","board":"board-b","state":"draft","title":"FICTIONAL other board","shared_read":(),"reviewer_memo":"FICTIONAL INTERNAL THREE"},
    {"id":"R04","owner":"learner-b","board":"board-a","state":"draft","title":"FICTIONAL shared reading","shared_read":("learner-a",),"reviewer_memo":"FICTIONAL INTERNAL FOUR"},
    {"id":"R05","owner":"learner-a","board":"board-a","state":"retired","title":"FICTIONAL retired plan","shared_read":(),"reviewer_memo":"FICTIONAL INTERNAL FIVE"},
)

def valid_actor(actor):
    return (type(actor) is Actor and type(actor.subject) is str and bool(actor.subject)
            and type(actor.role) is str and type(actor.boards) is tuple
            and all(type(board) is str and bool(board) for board in actor.boards))

def base_scope(actor, record):
    return valid_actor(actor) and record["board"] in actor.boards and record["state"] in ("draft", "submitted")

def can_read(actor, record):
    if not base_scope(actor, record):
        return False
    if actor.role == "reviewer":
        return record["state"] == "submitted"
    return actor.role == "contributor" and (actor.subject == record["owner"] or actor.subject in record["shared_read"])

def public_record(record):
    return {key:record[key] for key in ("id", "title", "state")}

class ReportApplication:
    def __init__(self, export_policy, export_projection):
        self.records = deepcopy(SEED)
        self.export_policy = export_policy
        self.export_projection = export_projection

    def detail(self, actor, item_id):
        if not valid_actor(actor):
            return {"outcome":"denied", "record":None}
        record = next((row for row in self.records if row["id"] == item_id), None)
        if record is None or not can_read(actor, record):
            return {"outcome":"not-found", "record":None}
        return {"outcome":"ok", "record":public_record(record)}

    def export(self, actor):
        if not valid_actor(actor):
            return {"outcome":"denied", "rows":[], "count":0}
        rows = [self.export_projection(row) for row in self.records if self.export_policy(actor, row)]
        return {"outcome":"ok", "rows":rows, "count":len(rows)}

def make_app():
    return ReportApplication(can_read, dict)

def run_demo(factory):
    app = factory()
    detail = app.detail(LEARNER, "R04")
    exported = app.export(LEARNER)
    return {"synthetic":True, "shared_detail_allowed":detail["outcome"] == "ok",
            "export_uses_operation_policy":[row["id"] for row in exported["rows"]] == ["R01"],
            "export_has_only_public_fields":all(set(row) == {"id", "title", "state"} for row in exported["rows"])}

def main(factory):
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    report = run_demo(factory)
    print(json.dumps(report, sort_keys=True))
    return 0 if all(report.values()) else 1

if __name__ == "__main__":
    raise SystemExit(main(make_app))
