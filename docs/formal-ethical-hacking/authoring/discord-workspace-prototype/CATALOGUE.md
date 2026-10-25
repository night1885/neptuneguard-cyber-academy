# Draft curriculum card browser

runtimeIntegration:false; publishable:false. Default-off and detached.
Baseline 602f542b2d28e80928bcd64613dc7a2a054248b7. Source catalogue blob:
afd3166a401486c214fb07a386eaad20212a41ba; README focus-label source:
8ca3cebc3970470f95bb5e72ff26748aa2d15fda.

The actual 37 entries/65 prerequisite edges are snapshotted into 13 card groups and
37 metadata previews, preserving catalogue order. Labels are curated short descriptions,
not exact document titles. No lesson body/file is loaded; actual lessons may add prerequisites
and scope. The graph does not enforce access/progress. Supporting drafts are not registered.
Null/disabled routes reject forged use; server-held frozen prev/home/next routes make Home
return from a preview to its card group. Existing binding/revision/access/expiry and media
cleanup remain. Legacy arithmetic routes are unchanged when no explicit routes are supplied.
Frames remain capped at three cards; cursor capacity expands to 100. New catalogues cap at
60 entries/80 cursors. No production key, assignment, learner state or publication changes.

Combined selected run: node --test navigation.test.mjs adapters.test.mjs catalogue.test.mjs.
88 passed on Node v20.20.1 (34 unchanged navigation, 34 unchanged adapter, 20 new cases),
zero failures/cancellations/skips. Original sources/dependencies were blob-verified; all
50 actual metadata views, 37 IDs and 65 edges were checked with synthetic providers.
The separate 18 card tests were NOT rerun: not a 106-test full suite. No full checkout,
SDK/live Discord, learner usability, mobile/keyboard or release validation occurred.
Formal course registration/authoritative providers and real lesson delivery remain separate
gates. Earlier validation records retain their historical scope. Native layout is still
client-controlled. No command/modal navigation or public fallback is introduced.
