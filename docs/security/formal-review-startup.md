# Correction: no persistent learner-review storage

The user clarified that this workflow must not persist learner report text, feedback, identities, source identifiers, consent histories or operation receipts. The earlier 24-hour retention discussion is not authorization to build or activate learner-data storage. The proposed storage and retention infrastructure is rejected for this workflow.

The newly added storage-backed startup implementation has been removed. createFormalReviewStartupAttachment returns undefined by default and rejects explicit enabled:true before accessing resource factories, tokens, transport, pools or providers. It has no provider imports, polling or interaction listeners. The production executable is unchanged and does not select this startup path.

The replaced startup acceptance tests now verify the corrected no-storage boundary, not acceptance of the rejected implementation. Existing lifecycle, adapter and composition tests in the workflow still exercise older isolated source candidates; their success must not be represented as approval to store learner data.

This is containment of the new startup path, not a claim that every persistence candidate has been removed from PR #63. Older formal-review-postgres, core/composition, receipt-recovery, discovery and migration candidates remain in source and require a dependency-scoped removal/replacement review. Do not activate or provision them for this workflow. Documentation or PR descriptions claiming those candidates as the intended design are superseded by this correction.

No database migration, production deletion, backup change, enrollment-record change or deployment is authorized or performed by this source correction. Existing unrelated academy functionality is not disabled. Future transient processing or Discord output must be separately specified; no-persistence by the bot is not a promise about Discord retention. No Copilot review is requested or relied upon.
