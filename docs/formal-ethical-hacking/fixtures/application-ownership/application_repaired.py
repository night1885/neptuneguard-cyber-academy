"""Repaired policy over the same in-process teaching request/database/response flow."""
from application_lab import DemoApplication, main


def can_read(actor, note):
    if note["state"] not in ("draft", "submitted") or note["course"] not in actor.courses:
        return False
    if actor.role == "instructor":
        return True
    return (actor.role == "student" and note["state"] == "draft"
            and actor.subject_id == note["owner"])


def make_app():
    return DemoApplication(can_read)


if __name__ == "__main__":
    raise SystemExit(main(make_app))
