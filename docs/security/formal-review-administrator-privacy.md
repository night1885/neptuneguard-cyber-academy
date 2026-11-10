# Administrator-and-learner channel policy candidate

The explicit new source-verifier mode permits guild Administrator roles, consistent with the approved report audience. The guild owner and academy bot remain trusted participants. No claim is made that Discord Administrators are excluded from channel content. An Administrator permission on the everyone role is rejected.

The source channel still requires exactly the everyone-deny overwrite plus explicit learner, owner and bot view/history overwrites. Additional member/role grants, public visibility, malformed metadata and snapshot drift are rejected. Existing unrelated channels are not rewritten to fit this layout. A dedicated source channel must be separately provisioned and verified.

Only the learner may invoke message evidence retrieval. Current verified Administrators may request metadata-only private-channel preflight. Two fresh role/channel snapshots and post-check authority are required; successful prior checks are not cached. Source read limits, origin checks, transport deadlines and text/attachment restrictions remain in force.

Runtime must independently enforce current reviewer and course/exercise/assignment authority and call privacy checks on protected operations. This source change is not production startup wiring or live Discord acceptance. It changes no live role, channel, overwrite, flag or deployment.
