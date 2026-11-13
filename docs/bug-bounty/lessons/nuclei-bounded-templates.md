# Review one Nuclei template before execution

## Outcome and prerequisites

Understand exactly what a template sends and matches. Complete the allowlist and probing lessons. Run automated templates only where the current program permits the selected request and intensity. A reviewed informational check is not the same as permission for a template pack.

## Create a transparent teaching template

In a new private scratch directory, create this file. It sends one GET to the supplied base URL and matches HTTP 200 only. It checks reachability, not a vulnerability.

```bash
mkdir -p reviewed
cat > reviewed/status-check.yaml <<'YAML'
id: academy-status-observation
info:
  name: Academy HTTP 200 observation
  author: academy
  severity: info
http:
  - method: GET
    path:
      - "{{BaseURL}}"
    matchers:
      - type: status
        status:
          - 200
YAML
```

Read it line by line: the path is the approved base URL, there is one request, no payload loop, no callback, no browser and no mutation body. A status matcher does not evaluate authorization or impact. Never assume an unfamiliar template has these same properties.

## Conditional program command

Install through official documentation, inspect local help and verify that program policy permits custom templates. Some Nuclei versions warn about unsigned templates; do not disable organization-required trust controls to run this exercise.

```bash
nuclei -version
nuclei -h
nuclei -u https://app.example.invalid/ -t ./reviewed/status-check.yaml -rl 1 -c 1 -bs 1 -dr -o nuclei-results.txt
```

Replace only with a reviewed permitted base URL. -t selects the single file; -rl 1 caps request rate; -c 1 and -bs 1 limit parallel templates and targets; -dr disables redirects; -o saves output. Review local configuration, automatic updates and tool-service interactions too; template inspection alone does not inventory every network connection.

Do not use broad template directories, workflows, automatic scanning or fuzzing options here. If the program does not allow this tool, analyze the YAML without execution.

## Exercise and explained answer

What does a match prove? Only that the template observed a matching status. It is not a valid vulnerability report or a bounty claim. A nonmatch does not prove security or absence.

## Troubleshooting and cleanup

Stop on throttling or instability. A missing file is a setup error, not a target finding. Remove only your scratch template and permitted output; retain no secrets.

## Source and validation limit

https://docs.projectdiscovery.io/opensource/nuclei/running

The YAML structure and shell syntax are checked offline. Nuclei validation, template execution, live scans and update traffic were not executed during authoring.
