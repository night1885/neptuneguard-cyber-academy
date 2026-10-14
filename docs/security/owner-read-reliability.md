# Owner read reliability batch

The router wraps owner console views, directory/detail views, enrollment acknowledgment review, and submitted learner-ID lookup in one owner-read guard. The default budget is 60 admitted reads per one-minute window, one in-flight read per actor, with the existing bounded guard capacity. Lookup form opening and approval/access/submission mutations are excluded. Learner enrollment-status checks retain their existing separate guard.

The default response deadline is 10 seconds. A timeout reports no confirmed result and suppresses late transport responses. It does not cancel database work or clear the in-flight guard until the underlying read finishes. Contextual routing and lookup forwarding use the core router within the admitted operation, avoiding duplicate budget charges.

Authorization remains in the existing handlers. Unauthorized, disabled, and foreign-guild interactions are delegated for normal denial rather than consuming the owner budget. Unknown errors still propagate to runtime error handling; raw errors are not included in these guard responses.

Tests cover shared budget, reset boundary, blocked overlaps after timeout, late-reply suppression, mutation exclusion, configuration validation and integrated overview query admission. Exact-head CI is pending. This patch does not prove live Discord behavior, query cancellation, network-partition recovery, or shutdown during a timed-out read. Controlled live and shutdown verification remain release gates. No production configuration, database, deployment or publication is changed.
