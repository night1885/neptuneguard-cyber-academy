# Receipt SQL - disposable validation candidate

Baseline: e60d2d2d901bbe1544a287ed7cd504afff65fd2e. Four new source files only: the receipt SQL candidate, its default-off PostgreSQL runner, a separate marker-gated workflow and this note. No existing runtime, adapter, schema, workflow, dependency or startup file is edited. Publication and CI execution require explicit approval; no Copilot is used.

## Exact-source assembly

The SQL and runner were reconstructed and matched their previously recorded SHA-256 values: SQL f4d867645144c37e6fd1d8507aeda55fc8f4c9808bda6b4fd7eed5daba28fc49; runner f1c7e73c49ea66a463a27cb52a87920430b80973e48ec703913ae352476f5d44. The workflow matched 6b5e5c09a28f8eed43246e92b2b92937fcce21882ed166c10d2881ae81145af7. These hashes identify review drafts, not SQL correctness or independent security approval.

## Intended protocol and open limits

A separate web_review_receipt_candidate schema is proposed. Owner-controlled scope generations and finite grants gate atomic bookmark/receipt writes. Same-operation replay returns the original metadata result; changed payloads reject. Receipt capacity is bounded without eviction. Cleanup first persists inactive retirement or follows a newer generation, retains the scope fence and is not executable by the worker. Worker grants are limited to schema USAGE and selected function EXECUTE.

This is not a boundary against hostile database owners or privileged restore/DDL. Retained fences are not an approved real-person retention policy. No receipt-aware service adapter, durable original-command custody, UI recovery, real Discord authentication, content-loader composition, production cleanup policy or restore-safety implementation is included. Existing rehearsal behavior remains unchanged and unreconciled.

## Proposed CI effects

The new workflow runs only on applicable pushes to feat/fictional-reviewer-validation when the commit message contains [receipt-sql-validate] and the repository/ref checks match. No main, PR, manual or scheduled trigger is added for this workflow. Unmarked/skipped jobs are not acceptance.

A marked publication requests four jobs: Node 20/22 x PostgreSQL 16/18, each capped at ten minutes. Existing PR automation may also run and consume Actions minutes. Each job creates a fresh synthetic PostgreSQL service owner/database before its steps. The enabled runner would create the synthetic web_receipt_ci_worker role, apply only the exact CI-guarded candidate SQL, perform its fifteen prepared child subtests and close its pools. All synthetic rows/roles are disposed with the service container; no live cleanup is authorized.

The job uses contents:read, checkout without persisted credentials and existing lockfile dependencies with lifecycle scripts disabled. It requests no repository secret, production credential, protected environment or repository-write token. Repository-read-only does not mean database-read-only: approved role/schema/data operations occur only inside the disposable fixture. Matching database names or loopback ports alone are not isolation proof.

## Actual local checks

On 2026-11-02, Node v20.20.1 syntax checking, YAML parsing/structure assertions and the workflow's actual hash command passed against the assembled SQL bytes. Default-off execution produced one skipped parent and zero passed database tests. Four isolated invocations rejected wrong URL, missing CI admission, unsupported major and changed SQL bytes before pg import/connection. No PostgreSQL syntax parser/server, SQL application, role/grant operation, connected subtest, dependency installation, GitHub Actions run or existing contract suite ran locally. The SQL remains unparsed and all fifteen connected subtests are unexecuted.

The workflow also names the existing core/lifecycle/adapter/snapshot contract suites. Their prior green checks do not validate these new SQL semantics. Inspect the exact committed head and actual enabled step/counts before claiming acceptance. A NULL receipt is no visible receipt, not a no-write certificate; expected lock-wait denial must use SQLSTATE 42501 rather than treating timeout as success.

Independent human/security review, actual PostgreSQL 16/18 acceptance, service composition, durable intent, privacy/retention/restore decisions, learner/staff separation and release/staging/rollback approval remain required. No merge, live database, Render, Discord, learner-data collection, runtime activation or deployment is authorized by this candidate.
