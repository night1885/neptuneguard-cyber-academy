# Bug Bounty

One course, nine named modules, 44 authored lessons. Internal filenames are references, not separate courses.

## Delivery status

The 44 lessons exist at source commit `c2bd1f738bd8649270dccd4a99ce738eaad50101`. This catalogue is a consolidation proposal, not a declaration that teaching coverage or academy delivery is complete. Academy registration, reader integration, delivery tests, CI, PR, merge and deployment remain pending.

## Practice model

Bugcrowd and other eligible bounty programs are the primary practice environment. Every asset, account, method and intensity must be permitted by the current written terms. A platform listing is not blanket authorization. Local examples are optional preparation. Complete analysis without execution when no suitable authorized activity exists. No valid finding, acceptance or payout is required for learning completion.

## Learning order

The following is a proposed reading order. It is not yet a verified prerequisite graph; see CONTENT-AUDIT.md for a known automation/resource-limit sequencing issue.

### Foundations and evidence

- [Read program brief](lessons/read-program-brief.md)
- [Inspect approved http request](lessons/inspect-approved-http-request.md)
- [Controlled accounts and sessions](lessons/controlled-accounts-and-sessions.md)
- [Read browser network evidence](lessons/read-browser-network-evidence.md)
- [Burp repeater controlled comparisons](lessons/burp-repeater-controlled-comparisons.md)
- [Json and evidence](lessons/json-and-evidence.md)

### Scope, discovery and mapping

- [Build a scope allowlist](lessons/build-a-scope-allowlist.md)
- [Map application workflows](lessons/map-application-workflows.md)
- [Api inventory and versions](lessons/api-inventory-and-versions.md)
- [Javascript source maps and client routes](lessons/javascript-source-maps-and-client-routes.md)
- [Dns records with dig](lessons/dns-records-with-dig.md)
- [Tls certificate inspection with openssl](lessons/tls-certificate-inspection-with-openssl.md)
- [Passive discovery with subfinder](lessons/passive-discovery-with-subfinder.md)

### Identity and permissions

- [Compare object authorization](lessons/compare-object-authorization.md)
- [Property and function permissions](lessons/property-and-function-permissions.md)
- [Account recovery boundaries](lessons/account-recovery-boundaries.md)
- [Jwt claims and verification](lessons/jwt-claims-and-verification.md)
- [Oauth redirect and callback binding](lessons/oauth-redirect-and-callback-binding.md)
- [Open redirects and redirect validation](lessons/open-redirects-and-redirect-validation.md)

### Browser trust boundaries

- [Origins and cors](lessons/origins-and-cors.md)
- [Csrf and state changing requests](lessons/csrf-and-state-changing-requests.md)
- [Html output contexts](lessons/html-output-contexts.md)
- [Websocket handshake and messages](lessons/websocket-handshake-and-messages.md)

### Inputs, parsers and server-side boundaries

- [Sql code and data](lessons/sql-code-and-data.md)
- [Path traversal and file reads](lessons/path-traversal-and-file-reads.md)
- [File upload policy boundaries](lessons/file-upload-policy-boundaries.md)
- [Xml parser boundaries](lessons/xml-parser-boundaries.md)
- [Server side request destinations](lessons/server-side-request-destinations.md)
- [Template injection and command boundaries](lessons/template-injection-and-command-boundaries.md)
- [Deserialization boundaries](lessons/deserialization-boundaries.md)
- [Prototype pollution model](lessons/prototype-pollution-model.md)
- [Graphql objects fields and errors](lessons/graphql-objects-fields-and-errors.md)

### Business workflows and resource limits

- [Business workflow invariants](lessons/business-workflow-invariants.md)
- [Race condition atomicity](lessons/race-condition-atomicity.md)
- [Rate limits and resource consumption](lessons/rate-limits-and-resource-consumption.md)

### Shared infrastructure

- [Cache keys and private content](lessons/cache-keys-and-private-content.md)
- [Request framing boundaries](lessons/request-framing-boundaries.md)

### Bounded automation

- [Httpx bounded probing](lessons/httpx-bounded-probing.md)
- [Katana bounded crawling](lessons/katana-bounded-crawling.md)
- [Ffuf bounded content discovery](lessons/ffuf-bounded-content-discovery.md)
- [Nuclei bounded templates](lessons/nuclei-bounded-templates.md)

### Reporting, triage and capstone

- [Write reproducible report](lessons/write-reproducible-report.md)
- [Triage duplicates and retesting](lessons/triage-duplicates-and-retesting.md)
- [Capstone authorized assessment plan](lessons/capstone-authorized-assessment-plan.md)

## Single Markdown notebook

The companion builder reads the exact 44 lessons from the pinned Git commit in an existing local checkout, not from mutable working files. It makes no network requests and executes no lesson commands. It rebases Markdown headings outside fenced code blocks and converts supported lesson links to notebook anchors.

```bash
python3 docs/bug-bounty/build-notebook.py --repo . --manifest docs/bug-bounty/course-manifest.json --output Bug-Bounty-notebook.md
```

Use Python 3 and a Git version that supports GIT_NO_LAZY_FETCH. A complete local checkout with the pinned objects is required; the builder disables lazy fetching rather than downloading missing objects. Use a private output location not already containing that filename; the builder refuses overwrites. Do not publish the result without separate approval. This step is for the owner's notebook, not academy enrollment or delivery. A full 44-lesson notebook build remains to be executed against the real repository; synthetic builder tests are not that build.

## Teaching standard

Lessons should explain why and when to use each technique, prerequisites, commands or tool steps, consequential options, expected and alternative results, evidence limits, a bounded exercise, explained answers and cleanup. Expected behavior must remain distinct from observed results. Syntax checks and local examples do not establish practical reproduction. The audit identifies work still required to meet this standard.

## Review and preservation boundaries

See CONTENT-AUDIT.md before integration. Fix identified content issues under a separately reviewed patch; do not silently edit lessons during consolidation. Preserve Ethical Hacking, staging, verification bot, enrollment, access, progress, storage, grading and certification. Repository writes, PR opening, merge and deployment each require separate approval.
