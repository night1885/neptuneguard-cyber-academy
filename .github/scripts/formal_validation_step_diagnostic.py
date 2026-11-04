"""One-shot job/step metadata publication for an exact failed validation run."""
import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request

OWNER = "night1885"
REPO = "neptuneguard-cyber-academy"
BRANCH = "feat/fictional-reviewer-validation"
TARGET = "e4b48c1e44f29473d646dd46deb93eee1bbaeb11"
RUN = 41387799390
WORKFLOW = ".github/workflows/formal-workspace-validation.yml"
EVIDENCE = ".ci-evidence/formal-validation-e4b48c1.json"
BASE = "https://api.github.com/repos/" + OWNER + "/" + REPO


def api(method, path, body=None):
    payload = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(BASE + path, data=payload, method=method, headers={
        "Authorization": "Bearer " + os.environ["GH_TOKEN"],
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main():
    if os.environ.get("GITHUB_REPOSITORY") != OWNER + "/" + REPO or os.environ.get("GITHUB_REF") != "refs/heads/" + BRANCH or "[formal-step-diagnostic]" not in os.environ.get("APPROVED_COMMIT_MESSAGE", ""):
        raise RuntimeError("Approved diagnostic branch/marker required")
    run = api("GET", "/actions/runs/" + str(RUN))
    if run.get("head_sha") != TARGET or run.get("path", "").split("@")[0] != WORKFLOW or run.get("status") != "completed" or run.get("conclusion") != "failure":
        raise RuntimeError("Failed run identity mismatch")
    result = api("GET", "/actions/runs/" + str(RUN) + "/jobs?filter=latest&per_page=100")
    if result.get("total_count", 101) > 100:
        raise RuntimeError("Incomplete job inventory")
    rows = []
    for job in result.get("jobs", []):
        if job.get("name") not in ("validation (20)", "validation (22)"):
            continue
        if job.get("status") != "completed" or job.get("conclusion") != "failure":
            raise RuntimeError("Unexpected validation job outcome")
        steps = [{"name": step.get("name", "")[:200], "number": step.get("number"), "status": step.get("status"), "conclusion": step.get("conclusion")} for step in job.get("steps", [])]
        rows.append({"job_id": job["id"], "name": job["name"], "conclusion": job["conclusion"], "steps": steps})
    if sorted(row["name"] for row in rows) != ["validation (20)", "validation (22)"]:
        raise RuntimeError("Expected two failed validation jobs")
    report = {"version": 1, "scope": "Exact historical validation run: job/step metadata only", "source_commit": TARGET, "source_run_id": RUN, "source_workflow": WORKFLOW, "publisher_commit": os.environ["GITHUB_SHA"], "jobs": sorted(rows, key=lambda row: row["name"]), "raw_logs_exported": False}
    text = json.dumps(report, indent=2) + "\n"
    if len(text.encode()) > 16384:
        raise RuntimeError("Bounded diagnostic exceeded")
    path = "/contents/" + urllib.parse.quote(EVIDENCE, safe="/")
    try:
        api("GET", path + "?" + urllib.parse.urlencode({"ref": BRANCH}))
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise RuntimeError("Evidence lookup failed") from None
    else:
        raise RuntimeError("Fixed evidence path already exists; no overwrite authorized")
    api("PUT", path, {"message": "ci: record exact formal validation step metadata", "branch": BRANCH, "content": base64.b64encode(text.encode()).decode()})


if __name__ == "__main__":
    try:
        main()
    except Exception:
        raise SystemExit("Formal step diagnostic unavailable; no raw provider error exported") from None
