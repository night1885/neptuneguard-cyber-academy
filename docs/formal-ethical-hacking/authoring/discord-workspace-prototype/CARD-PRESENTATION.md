# Illustrated cards — detached presentation milestone

Draft maintainer implementation. runtimeIntegration:false; publishable:false.
Baseline 872029785659638f97fb1b0c076ba2fe9ddd625d. Records the user's supplied card-style
reference and replaces the optional review home's plain-list presentation with illustrated
cards and Open buttons. Private, in-place, button-only navigation is preserved.

## Native visual design and limits

createCardReviewWorkspace defaults off. Its current draft slice shows three existing
readings, not a complete course catalogue: coloured accent embeds, short previews, original
shield/compass/book PNG thumbnails and dedicated Open controls. Open shows a full reading
card; Home restores the card view in the same private message. Previous/Next remain.
Native Discord layout may differ by client; this is not a pixel-identical web/CSS grid.
Meaningful titles/button labels do not rely on colour/art. Artwork is decorative, original
procedural 96x96 PNG output, not copied reference art or an uploaded user photograph.

Legacy rendering remains; structured cards require explicit allowCards:true. Fixed frame
shape excludes arbitrary flags, media URLs, file paths and message options. Three art keys
produce Buffer attachments with fixed filenames, PNG signature/hash checks and a 4 KiB
per-image cap. No external image fetch occurs. At most three readings/four cursors are
supported; larger bundles reject rather than truncate. Titles cap at 80 characters,
previews 180, descriptions 1600 and aggregate embed text 5500 (below Discord's 6000 limit).
This uses ordinary embeds/buttons, not Components V2 or public fallback.

Open targets must have been offered by the current server-held view, and controls remain
bound to actor/guild/channel/course/private message/token/revision/expiry. Access is checked
around rendering. Edits replace prior attachment references; bound denials clear retained
attachments, embeds and controls when editing succeeds. Wrong actors cannot edit the
owner workspace. Retiring/removing references cannot erase already delivered/copied data.
The previous external-revocation and transport limitations remain; no retention policy is
implemented. No learner slash command or modal navigation is added.

## Actual selected validation

    node --test navigation.test.mjs cards.test.mjs

52 tests passed together on Node v20.20.1: the 34 unmodified navigation regressions plus
18 new card cases; zero failures, cancelled tests or skips. Regression source matched Git
blob c3590cf282967b5eaae36c1ce4d2abed8cd50f34; the original controller matched
ac027f8e40c7d4436b174e7273b0397d6b4f68bc before edits. Unchanged access/content/bundle
copies were blob-verified. The updated controller passed syntax checking. The tests used
synthetic interactions/providers with actual Node composition, covering private guards,
card selection/offered targets, attachment-only media, malformed bounds, stale/foreign/public
controls, revocation, expiry, snapshots and opt-in. All three generated PNGs were also
decoded/integrity-checked with Pillow as 96x96 images. This is not hostile-image assurance.

No live SDK serialization/upload/render, Discord gateway/API, learner walkthrough, full
checkout or CI was validated. The separate adapters.test.mjs suite was NOT rerun; this is
not an 86-test full suite. There is no live course UI screenshot or pixel-layout claim.

## Before activation

Validate real attachment replacement, private entry/token lifecycle, native card placement,
keyboard/mobile readability, performance and authoritative course integration. The missing
formal course registration described in ADAPTERS.md remains unresolved. Progress, evidence,
review, awards and storage policy remain separate. No handler, published button, database,
production flag, learner data or Community Learning change is included. Earlier README and
adapter records retain their historical scope; this is a new optional presentation path.

References:
https://docs.discord.com/developers/resources/message
https://docs.discord.com/developers/reference
https://discord.js.org/docs/packages/discord.js/main/InteractionEditReplyOptions:Interface
