# Bug Bounty

One course, nine named modules, 44 authored lessons. Filenames identify lessons, not separate numbered courses.

## Delivery status and source pin

This is work in progress, not an academy-ready release. The manifest defines the module membership and proposed reading order below. Its source_commit remains ae047f8a4d0f8289dbba1a4a66699a17c393f560. That historical snapshot includes the first targeted repairs but not the new prerequisite and capstone wording in this combined proposal. After this repair is committed, a separately approved source-pin update must select the resulting known commit before the final notebook build. Do not describe a notebook built from the old pin as including these later lesson edits.

The complete real-source notebook has not been assembled or inspected. Academy registration, reader integration, delivery tests, CI, PR, merge and deployment remain pending.

## Practice and teaching standard

Bugcrowd and other eligible programs are the primary practice environment. Each asset, account, method and intensity must fit current written permission. Local examples are optional preparation; complete analysis without execution when a suitable authorized activity is unavailable. A platform listing is not blanket authorization. No valid finding, acceptance or payout is required.

Lessons should explain purpose, prerequisites, exact commands or tool steps, consequential options, expected and alternative results, evidence limits, bounded exercises, explained answers and cleanup. Offline examples and syntax checks are not live tool reproduction. See CONTENT-AUDIT.md for remaining coverage and execution gaps.

## Reading order

This proposal resolves the five reviewed reading-order issues. It is not a certification of every prerequisite or the complete teaching coverage.

### Foundations and evidence

- [Read program brief](lessons/read-program-brief.md)
- [Inspect approved HTTP request](lessons/inspect-approved-http-request.md)
- [Controlled accounts and sessions](lessons/controlled-accounts-and-sessions.md)
- [Read browser network evidence](lessons/read-browser-network-evidence.md)
- [Burp Repeater controlled comparisons](lessons/burp-repeater-controlled-comparisons.md)
- [JSON and evidence](lessons/json-and-evidence.md)

### Scope, discovery and mapping

- [Build a scope allowlist](lessons/build-a-scope-allowlist.md)
- [Map application workflows](lessons/map-application-workflows.md)
- [API inventory and versions](lessons/api-inventory-and-versions.md)
- [JavaScript source maps and client routes](lessons/javascript-source-maps-and-client-routes.md)
- [DNS records with dig](lessons/dns-records-with-dig.md)
- [TLS certificate inspection with OpenSSL](lessons/tls-certificate-inspection-with-openssl.md)
- [Passive discovery with Subfinder](lessons/passive-discovery-with-subfinder.md)

### Identity and permissions

- [Compare object authorization](lessons/compare-object-authorization.md)
- [Property and function permissions](lessons/property-and-function-permissions.md)
- [Account recovery boundaries](lessons/account-recovery-boundaries.md)
- [JWT claims and verification](lessons/jwt-claims-and-verification.md)
- [OAuth redirect and callback binding](lessons/oauth-redirect-and-callback-binding.md)

### Browser trust boundaries

- [Origins and CORS](lessons/origins-and-cors.md)
- [Open redirects and redirect validation](lessons/open-redirects-and-redirect-validation.md)
- [CSRF and state changing requests](lessons/csrf-and-state-changing-requests.md)
- [HTML output contexts](lessons/html-output-contexts.md)
- [WebSocket handshake and messages](lessons/websocket-handshake-and-messages.md)

### Inputs, parsers and server-side boundaries

- [SQL code and data](lessons/sql-code-and-data.md)
- [File upload policy boundaries](lessons/file-upload-policy-boundaries.md)
- [Server side request destinations](lessons/server-side-request-destinations.md)
- [Path traversal and file reads](lessons/path-traversal-and-file-reads.md)
- [XML parser boundaries](lessons/xml-parser-boundaries.md)
- [Template injection and command boundaries](lessons/template-injection-and-command-boundaries.md)
- [Deserialization boundaries](lessons/deserialization-boundaries.md)
- [Prototype pollution model](lessons/prototype-pollution-model.md)
- [GraphQL objects fields and errors](lessons/graphql-objects-fields-and-errors.md)

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

## Notebook builder and offline regressions

Use Python 3 and Git supporting GIT_NO_LAZY_FETCH, with the pinned objects already present in a complete local checkout. The builder reads Git objects, disables lazy fetching, executes no lesson commands and refuses existing output files. It supports simple inline lesson links, fenced code and backtick code spans; it is not a complete Markdown parser. Images, fragments, reference links, link titles and other unsupported forms still need manual review. An unmatched inline backtick span conservatively suppresses later rewrites rather than claiming complete CommonMark behavior.

```bash
python3 docs/bug-bounty/tests/test_build_notebook.py -v
python3 docs/bug-bounty/build-notebook.py --repo . --manifest docs/bug-bounty/course-manifest.json --output Bug-Bounty-notebook.md
```

The tests create a temporary synthetic Git repository and do not execute lesson commands or contact live targets. Passing them does not establish a successful full-source notebook build. Use a private, new output path, inspect the actual complete output and obtain publication approval separately.

## Preservation and release boundaries

Preserve Ethical Hacking, staging, the verification bot, enrollment, access, progress, storage, grading and certification. Capstone review is self-review and owner-managed feedback, not a new grading feature or learner-acceptance release gate. The complete owner-review notebook must precede academy implementation. Repository writes, PR, merge and deployment each need separate approval.
