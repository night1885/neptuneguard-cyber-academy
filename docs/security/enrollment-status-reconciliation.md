# Read-only enrollment status — source route, not publication

The routed submission wrapper now handles cert:submit:status for the authenticated learner and cert:submit:status:<Discord ID> for the configured owner only. Certification must be enabled and the interaction must originate in the configured guild. Reads remain available when new enrollment submission is disabled, allowing review of existing records without activating submission.

The handler performs a parameterized SELECT of status and permanent student ID only. It does not query or display typed names, agreement acknowledgment names, comprehension answers, or audit details. Responses are private and disable mention parsing. No buttons or messages are published by this commit.

Status reads do not acquire the submission mutation lock. They can show a previously committed snapshot while a request remains in flight. No row or unchanged status does not prove failure. The response deadline produces an uncertainty message without interpreting the late query result or granting access. Owner review is still required after an uncertain write outcome. This is not durable transaction recovery.

Nine tests cover authenticated self-query, owner-only targets, context rejection, missing or unexpected records, database-error privacy, read deadlines, and routing with submission disabled. They are added but not yet executed. Existing certification CI should include the suite; verify the new commit's checks separately.

Before activation, add read-request abuse controls, test read snapshots during real PostgreSQL in-flight transactions, and validate live Discord private-response behavior. Timeout/cancellation and multi-instance recovery remain separate work. No start/status buttons, production configuration, migrations, agreement publication, merge, deployment, or activation are authorized by this commit.
