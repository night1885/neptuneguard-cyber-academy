# W03 — independent fictional boundary cases

Draft paper worksheet after [W03 teaching](STANDALONE-WEB-W03-TEACHING.md). No filesystem mutation, upload, request or code execution is required or authorized. For each case state the invariant, supplied evidence, supported conclusion, unknowns, repair goal and allowed/rejected control pair.

1. A resolved candidate is in the sibling allowed-extra, but a string-prefix comparison against allowed returns True. Explain the mismatch between spelling and directory relationship. Do not infer that any file content was read.
2. A symbolic link resolves into that sibling. Explain why checking only the original name is insufficient and why an unresolved component comparison would not resolve the link for you.
3. The platform skips symlink creation. A learner counts the skip as successful rejection. Correct the evidence record without proposing privilege elevation or a host-policy change.
4. A resolved path lies inside the base, but no record-owner information exists. Explain the separate containment and authorization questions. State what a later filesystem change could invalidate without inventing a race-free repair.
5. Upload metadata looks correct, but the supplied synthetic buffer lacks the required prefix. Apply only the stated toy contract. Do not call the declared type proof of an image.
6. Correct metadata accompanies PNG_PREFIX alone. Compare acceptance under the written toy policy with claims of complete image validity or safe serving. Identify missing content-handling evidence.
7. Otherwise-valid synthetic buffers have lengths 1024 and 1025. State the boundary predictions and why rejecting 1025 alone would not establish acceptance of 1024. Compare post-buffer checks with early resource limits.
8. An application accepts a toy upload and uses the client name as its storage location while granting every enrolled learner retrieval. Identify the unaddressed storage-reference and per-resource permission decisions. This scenario supplies no actual deployed service or exploit evidence.

Finish with a source-to-boundary diagram and one bounded finding. List every unimplemented pipeline stage instead of claiming the toy fix secures the whole application. Keep answers fictional and use only approved private evidence handling. No module completion or practical permission follows.
