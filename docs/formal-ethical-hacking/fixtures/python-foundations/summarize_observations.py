"""Correct offline teaching starter. No network, shell or academy integration."""
import json
from pathlib import Path
import re
import sys

MAX_BYTES = 16384
MAX_RECORDS = 12
GROUPS = ("1xx", "2xx", "3xx", "4xx", "5xx", "not-recorded")


def validate_document(document):
    if not isinstance(document, dict) or set(document) != {"synthetic", "records"}:
        raise ValueError("Unexpected document shape")
    if document["synthetic"] is not True:
        raise ValueError("Expected fictional records")
    records = document["records"]
    if not isinstance(records, list) or len(records) > MAX_RECORDS:
        raise ValueError("Unexpected record collection")
    seen = set()
    for record in records:
        if not isinstance(record, dict) or set(record) != {"id", "method", "http_status", "client_exit"}:
            raise ValueError("Unexpected record shape")
        label = record["id"]
        if not isinstance(label, str) or re.fullmatch(r"[A-Z][0-9]{2}", label) is None or label in seen:
            raise ValueError("Unexpected record label")
        seen.add(label)
        if record["method"] not in ("GET", "HEAD"):
            raise ValueError("Unexpected teaching method")
        status = record["http_status"]
        if status is not None and (type(status) is not int or not 100 <= status <= 599):
            raise ValueError("Unexpected status value")
        client_exit = record["client_exit"]
        if type(client_exit) is not int or not 0 <= client_exit <= 255:
            raise ValueError("Unexpected client exit value")
    return tuple(dict(record) for record in records)


def load_records(path):
    with Path(path).open("rb") as handle:
        raw = handle.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("Teaching file too large")
    return validate_document(json.loads(raw.decode("utf-8")))


def status_group(status):
    if status is None:
        return "not-recorded"
    return f"{status // 100}xx"


def summarize(records):
    counts = dict.fromkeys(GROUPS, 0)
    for record in records:
        counts[status_group(record["http_status"])] += 1
    return {"synthetic": True, "record_count": len(records), "status_groups": counts,
            "nonzero_client_exits": sum(record["client_exit"] != 0 for record in records)}


def main():
    if len(sys.argv) != 1:
        print("No arguments accepted", file=sys.stderr)
        return 2
    try:
        records = load_records(Path(__file__).with_name("observations.json"))
        report = summarize(records)
    except (OSError, ValueError):
        print("Teaching data rejected; inspect the reviewed fixture locally", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
