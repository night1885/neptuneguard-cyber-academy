# W03 — paths, upload claims and resource boundaries

Draft learner material, not a canonical lesson, practical permission or completed module. Read the relevant W02 and foundation teaching or obtain reviewed equivalent skills within this course. No CPTS, OSCP or GPEN enrollment/completion is required. Original shared practical prerequisites are not waived.

## 1. A text prefix is not a directory relationship

Worked fictional layout: a test-owned workspace contains sibling directories allowed and allowed-extra. Their names share characters; the sibling is not inside allowed. Resolving dot segments does not correct an inappropriate string-prefix comparison. Symbolic links also require interpreting the resolved path relationship rather than trusting the original spelling.

The [path fixture](../lessons/EH-WEB-07.md) rejects absolute input, resolves existing paths strictly and needs a component-aware containment check on resolved paths. Its policy accepts the base itself or an existing descendant. It returns a Path object, not file contents, and establishes neither file type nor per-user authorization.

This model assumes a stable filesystem. A later open can encounter changed state; a path check is not a general race-free file capability. Do not introduce concurrent mutation, mounts, hard links or real filesystem roots to test beyond the supplied scope. A symbolic-link test skipped by the platform is untested behavior, not a pass or reason to elevate privileges.

## 2. Upload metadata is a claim

A client filename is not a safe storage reference. A declared content type does not establish content. A byte prefix is a limited observation, not complete parsing or proof of harmlessness. A size check after receiving a buffer is not an early streaming quota.

The [upload fixture](../lessons/EH-WEB-09.md) accepts a well-formed record only when its filename fully matches the specified ASCII stem plus lowercase .png, declared type equals image/png, buffer length is at least the eight-byte PNG_PREFIX and at most 1024, and bytes start with that prefix. The upper bound is inclusive. These are tiny teaching limits, not production recommendations.

Worked consequence: PNG_PREFIX alone can meet the written minimum/prefix conditions with suitable metadata. It is not a complete valid PNG. Do not change the contract after observing an accepted toy sample or call it safe to serve. Likewise, rejecting path-like names here is an inert name-policy decision, not evidence of a file having been opened or stored.

## 3. Map the missing pipeline

A real design needs separate decisions about identity/object authority, early resource bounds, metadata representation, format-appropriate content handling, generated storage references, controlled retrieval, safe serving and retention. Mark these as design requirements, not implemented controls in the toy fixture. Neither path containment nor upload admission grants access to another learner's attachment.

## Practice and practical gates

Complete the [W03 cases](STANDALONE-WEB-W03-CASES.md) using fictional data. For separately approved practice, keep all path objects inside the test-owned temporary workspace and all upload values synthetic. No personal files, actual uploads, active content, malware, archives, executable samples, hosted targets or new requests are authorized.

Retain source practical prerequisites, supported guest/tooling and approved offline transfer. Missing setup or skipped platform behavior requires review, not bypass. Later evidence should include predictions, actual results/skips, narrow repair, legitimate and rejected cases, final state and limitations. No source fixture, test or network operation runs in this authoring batch. Resource-limit depth, independent assessment, hardware reproduction and release gates remain open.
