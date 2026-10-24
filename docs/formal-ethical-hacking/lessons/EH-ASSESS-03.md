# EH-ASSESS-03 — Decide whether an advisory applies

Draft, not published. Requires EH-ASSESS-02 and NETWORK-FINDING-AND-RETEST.md. Proposed ID only, not runtime registration. This is an offline evidence-analysis exercise, not permission for further scanning or exploitation.

## Outcomes
Separate a product clue from verified identity, compare an installed build with an applicable vendor advisory, and state uncertainty when required evidence is missing.

## Start with the evidence chain
A port label is not a product identification. A banner can be configurable, incomplete or associated with an intermediary rather than the component you think you reached. A product name alone is not an affected-version determination. Establish the product, vendor/distribution, exact build, relevant configuration, evidence source and observation time before deciding applicability.

An advisory describes affected conditions and fixes. A CVE identifier refers to a vulnerability record, not a statement that your particular asset is affected. Reading an advisory never expands testing permission. Do not run an exploit to compensate for missing identity evidence.

## Why upstream versions can mislead
A distributor can backport a security fix into an older upstream version while retaining its version family. Red Hat documents this practice and the resulting false positives when tools infer vulnerability solely from upstream numbers. Conversely, an old-looking version is not automatically patched: confirm the exact package and advisory status.

Use the relevant vendor's build information and comparison rules. Do not compare arbitrary version strings alphabetically or assume package release suffixes are comparable across distributions. Do not assume that an installed update proves a long-running process has restarted into the corrected code. If runtime state matters and is unknown, preserve that uncertainty.

## Build an applicability table
For each required condition, record: advisory statement, asset evidence, source/provenance, match or mismatch, and remaining uncertainty. Useful conditions include exact product and build, platform, vulnerable feature, authentication prerequisites and reachable interface. Record unsupported assumptions instead of converting them into facts.

Distinguish these outcomes:
- Affected conditions supported by supplied evidence: report the match and its limits; exploitation is not implied.
- Not affected according to sufficient product-specific evidence: identify the precise advisory and build/configuration basis.
- Insufficient evidence: list what is missing and the least intrusive authorized way to clarify it.
- Conflicting evidence: preserve both sources and resolve identity, freshness or scope before asserting certainty.

These are course reasoning labels, not universal vendor status definitions. Inapplicable findings should not be called false positives without enough evidence to justify that conclusion.

## Offline exercise
Read VULNERABILITY-TRIAGE-CASEPACK.md. The products, identifiers, builds and evidence are fictional. For each case produce an applicability table and a bounded conclusion. Do not look for these products online, query a live host or invent package output. You are analysing supplied records, not executing a practical assessment.

For any missing fact, propose a narrowly scoped next action such as requesting an authoritative inventory record from the responsible owner. Do not perform that action or infer permission to access internal inventory.

## Deliverables and limits
Submit condition-by-condition reasoning, source labels, conclusion, confidence limits and a proposed next step. Review whether each claim follows from evidence rather than whether the student found the most alarming interpretation. Formal grading and case calibration remain pending. No author scan or live vulnerability validation was performed.

Source: Red Hat Security Backporting Practice, https://access.redhat.com/security/updates/backporting . This explains the general practice; it does not endorse the fictional exercise or establish applicability for a real asset.
