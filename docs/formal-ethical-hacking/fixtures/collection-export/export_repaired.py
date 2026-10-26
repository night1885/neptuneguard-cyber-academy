"""Visible operation-specific export reference, not a production authorization service."""
from export_lab import ReportApplication, base_scope, public_record, main

def can_export(actor, record):
    if not base_scope(actor, record):
        return False
    if actor.role == "reviewer":
        return record["state"] == "submitted"
    return actor.role == "contributor" and actor.subject == record["owner"]

def make_app():
    return ReportApplication(can_export, public_record)

if __name__ == "__main__":
    raise SystemExit(main(make_app))
