# Offline core CI and transfer-route integration — bounded record

Baseline 4188728f42b49a4fa794616039cec26436b34251. Draft integration, not a hosted CI result, full-checkout run, learner pilot or publication approval. Existing reader CI and application/fixture sources are unchanged by this batch.

## Route reconciliation
The pathway README links the separately authored collection-export supporting exercise. The independent-task text acknowledges its existence while retaining the ownership/update task's current scope. No canonical IDs, prerequisites, mandatory assessment, export/network permission, reader manifest or production runtime registration is added. Visible references/instructor notes require reviewed distribution separation; unfamiliarity and independent learner performance are not established.

The two original document transcriptions were Git-blob verified as 55d5486ac6718a0ced1c3a7693f5aa5e8b533bb1 (README) and 6c97bac1098cb3d46991b3020d08efe7ebfe31d1 (independent task). Anchors/replaced text are unique and changes can be reversed to the exact originals. New local links resolve in a selected virtual file set; unrelated existing links are not all revalidated. This is not independent semantic validation.

## Explicit workflow selection
A new branch/path-scoped push workflow targets Python 3.12 with actions/checkout@v4 (persist-credentials:false) and actions/setup-python@v5. It uses contents:read, a five-minute timeout per job, five independent matrix jobs and fail-fast:false. No pip/npm install, secret reference, database service, deployment command or workflow-dispatch action is added. Hosted checkout/runtime setup can use the network; selected teaching activities are offline. This does not guarantee behavior of unrelated existing repository automation.

Named groups: Python foundations (test_summary and test_summary_additional); ownership read (test_reference, test_cli, test_application_additional); ownership update (test_update_reference, test_update_cli, test_updates_additional); collection export (test_reference, test_cli); executable-search mock contracts only (test_search_contracts). Each uses its own fixture working directory; identical test_reference/test_cli names in different packages are not mixed in one interpreter/discovery run.

Positive groups may assert a starter CLI demo's expected nonzero outcome. They do not run deliberately red starter suites as release gates. No broad discovery, loopback transport, actual executable-search helpers, full student lab or platform certification is included. The non-root helper-practical requirement is not bypassed by running mock-only contracts.

## Local checks and limits
YAML was parsed locally with BaseLoader to preserve the on key. Selected assertions checked event/permissions/job shape, exact five allowlisted directories/commands, timeout, fail-fast, Python target and credential persistence. New link paths were normalized inside the reviewed virtual set. These static checks are not GitHub workflow validation, action execution or proof that jobs queue or pass. No fixture group was rerun in this integration batch; earlier measured runs retain their own source/version/scope. Python 3.12 is a target version range, not a newly validated complete platform matrix.

A matching push can trigger hosted compute if Actions is enabled and permissions allow. Actual run IDs, job outcomes/logs and failures must be inspected before asserting CI success. Independent semantic review, supported learner/reviewer reproduction, private evidence rules, accessibility, calibration and release approval remain outstanding. No learner evidence is collected and no deployment/activation is performed by this batch.
