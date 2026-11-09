# Current Administrator completion authorization

## Policy
Completion approval and certificate authorization require the acting user's current Discord Administrator permission in the academy server. Role names, instructor status and past permission do not authorize actions. Failed verification denies completion. Assignment and unrelated owner powers remain unchanged.

## Supported startup integration
restoration.js now selects attachAdministratorCertificationRuntime. Existing certification/course flags, schema and privilege readiness, restricted database configuration and shutdown behavior remain required. No flag is enabled by this source change. Courses-disabled and isolated formal-review profiles do not construct the completion course router. Community Learning and the separate verification bot are not changed.

The adapter composes the existing ready managed navigation, which validates lifecycle schema/privileges, then constructs the completion-only backend and controller using a verifier closed over the runtime's trusted Discord client. The initial registration/application console adds a generic Admin completion entry; visibility is not authorization. Clicking it requires current Administrator permission. An unregistered admin can use that console without becoming an approved learner. The form requests only the learner Discord ID and exact configured course key; submission creates a separate actor/server-bound expiring confirmation, not a completion. The backend checks current permission before database admission and after record locks. Completion/audit store the actual acting admin.

Legacy course completion buttons are intercepted before the owner handler and routed to the new confirmation controller. The old controller cannot mint completion confirmations through that supported route; assignment and its confirmations stay delegated to the owner-only controller. Old in-memory confirmations do not survive a process restart. The original exported lifecycle completeCourse API still exists for older callers/tests; this patch is not a claim that every alternate entry point uses the adapter. Only the supported restoration startup is integrated here.

## Validation
Verifier, backend, UI and runtime tests use synthetic Discord contexts. Disposable PostgreSQL 16/18 acceptance exercises the real completion transaction, concurrent retries and audit rollback. Prior green CI does not establish results for this integration commit. Verify exact-head CI and inspect review findings before merge. Real Discord modal timing, delivery and permission-refresh behavior still require controlled acceptance. Source assertions are not executed live startup evidence.

## Limits and release gates
Discord permission reads and PostgreSQL commits are not atomic. Disposing controls prevents new admission but cannot undo an already committed transaction. Schema changes, environment updates, Discord publication, merge and deployment need separate approval. No production operation or certificate issuance is performed here. Certificate criteria, authorization records, generation and delivery remain separate unfinished work.
