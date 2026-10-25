# Application code-review pathway — supporting draft

Draft-maintainer-only. runtimeIntegration:false. publishable:false.
Supporting K05/K06/K14 material, not canonical registration, a new lab permission,
a completed advanced-web pathway or certification alignment. Community Learning is excluded.

## Prerequisites and scope

Complete the reading prerequisites of the [ownership lab](../../lessons/APPLICATION-OWNERSHIP-LAB.md):
EH-WEB-01 through EH-WEB-06 concepts plus offline Python/SQL reading support. For the
update work, additionally use the [update lab](../../lessons/APPLICATION-UPDATE-LAB.md)
and its EH-WEB-08 field-policy prerequisite. These existing requirements are not reduced
by this supporting route. Provisioning, transfer, supported runtime, support/recovery and
private evidence handling must already be approved. Missing setup means BLOCKED.

Use only the existing fictional in-process applications in a trusted reviewed checkout.
No HTTP endpoint, PATCH network permission, loopback listener, public target, real account,
credential, installer or production database is introduced. Preserve repository starters.
Any permitted execution uses the existing lab instructions and a disposable learner-owned
copy. Python 3.12.8 is historical author evidence, not a universal platform guarantee.

## Learning sequence

1. [Trace a request and its response](01-REQUEST-TO-RESPONSE.md).
2. [Trace writable fields and stored state](02-WRITABLE-FIELD-REVIEW.md).
3. [Complete an independent investigation](03-INDEPENDENT-INVESTIGATION.md).
4. Instructor author material: [review notes](INSTRUCTOR-REVIEW.md).
5. Maintainer evidence: [validation and remaining gates](VALIDATION.md).

Predict, cite source, identify a legitimate control, observe only if permitted, repair in
a learner-owned copy, retest, then communicate bounded impact and uncertainty. Label each
result source-predicted, observed, blocked or unattempted. Historical test totals and supplied
answers are not a learner's observations. Record interventions and reference-solution access.

## Supporting transfer extension and selected automation

A newly authored [collection-export exercise](../../fixtures/collection-export/README.md)
adds a separate fixed in-memory example: permission to read a shared item is not permission
to export it, and selection/projection require separate review. It retains this route's
prerequisites and introduces no canonical ID, required pass gate, endpoint, network action,
real export destination or runtime adapter. Use its own reviewed setup and scope; do not
silently add its tasks to an already issued assessment brief.

The new folder contains a visible reference and instructor notes. Treat the complete folder
as maintainer material, not a protected exam or learner bundle to publish wholesale. New
authorship does not establish unfamiliarity to a learner. Record prior exposure and help;
actual supported reproduction, independent semantic review and assessment calibration are
still required. The existing investigation remains the ownership/update task unless a
separate reviewed brief explicitly selects the transfer extension.

The proposed formal-offline-core-tests.yml workflow checks named positive Python groups
in separate fixture working directories. It excludes broad discovery, deliberately red
starter suites, actual executable-search helper runs and loopback transport. Its read-only
repository permissions and test selection are not a deployment, privacy workflow or course
release approval. See [the integration record](OFFLINE-CORE-CI-REVIEW.md) for exact scope.
Configuration and earlier local package runs do not establish a successful hosted CI run.

## Background sources

OWASP Secure Code Review Cheat Sheet:
https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html
OWASP Authorization Cheat Sheet:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
OWASP Mass Assignment Cheat Sheet:
https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html

These are conceptual background, not endorsement or target-testing permission. The
source baseline for this authoring is b954cd2fed33e76564f150313ab2a36e1611c6e8.
