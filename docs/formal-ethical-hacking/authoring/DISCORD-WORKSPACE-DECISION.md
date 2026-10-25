# Formal workspace platform decision — private Discord

User-selected 2026-10-25. Baseline e30ea2c3c31bebd72f5e92f691a776aa89244978.
The formal learner workspace will use private, button-driven Discord interactions with
in-place navigation. No learner slash-command navigation or modal navigation is permitted.
This resolves the Discord-versus-web platform question, not every architecture/policy gate.
Historical undecided-platform statements in the earlier workflow/inspection documents
retain their original snapshot; this later decision supersedes that platform question only.

The selected first navigation slice uses ephemeral entry acknowledgement, a private message
and actor/guild/course/message-bound opaque controls. Normal authorized navigation edits
that message. Expiry/restart re-entry uses the course entry button and a fresh private
message, not a typed student-ID modal, slash-command fallback or public lesson response.
The ephemeral mechanism and ten-minute session duration are proposed implementation choices
for synthetic review, not evidence of an approved live configuration or complete usability.

[Standalone prototype](discord-workspace-prototype/README.md) and tests are maintainer-only,
default-off and unconnected to the bot. No real learner content/evidence or identity/storage
adapter is supplied. Publication, runtime wiring, public entry-button publication, database
schemas/connections and deployment require separate resolved designs and approvals.

Current authoritative course access, reviewer authority, evidence formats/limits, storage,
retention/deletion, audit policy and recovery remain unresolved. Course navigation does not
grant enrollment, lab permission, completion, saved progress or awards. Community Learning
and existing modal/command routes are not modified by this decision or prototype.
