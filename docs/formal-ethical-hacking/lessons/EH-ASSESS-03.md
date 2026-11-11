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

## Expanded teaching: match an advisory condition by condition

Use the existing fictional TRAIN-ADV-A evidence pack only. Its products and builds are invented, and TRAIN-ADV-A is not a CVE. This supplement authorizes no product search, package inspection, live request, exploit or restart.

### Build a chain before naming the result

An advisory match connects an identified component, an authoritative build record, applicable configuration and the advisory's stated prerequisites. A port number, conventional service label or recollected product name is not the entire chain.

For every link, record which source supplied it and whether that source concerns the actual running component at the relevant time. A package record can establish something installed without establishing that a process loaded it. A banner can identify a proxy or be configurable. Do not select the most alarming interpretation simply because the chain has gaps.

### Make the condition table explicit

For this pack, list the distributor and product, one of the explicitly affected builds, the export feature being enabled and the existence of low-privilege application users. Add the evidence record label beside each condition. Separate match, mismatch, unknown and conflict rather than forcing every row into yes or no.

A conclusion should refer to the whole supported set of conditions. If a required row is unknown, explain what that prevents you from deciding. Confidence is not improved by writing a longer paragraph around an unfilled cell.

### Why the package family is not the verdict

The fictional fixed build retains its upstream version family. That models backporting: a distributor applies a security fix to an older release without adopting the newest upstream release. Red Hat documents how upstream-only version checks can therefore generate false positives.

The converse is equally important. An older-looking package is not automatically fixed, and a distributor name is not proof that a particular fix was applied. Use the relevant exact build and advisory evidence. Do not compare arbitrary release suffixes alphabetically or invent a universal rule for all vendors.

The fictional pack lists specific affected builds and a fixed build. Unlisted builds remain outside that evidence. A suffix that looks later is not enough to assign them a status the pack never supplied.

### Case A: installed and running are separate claims

A02 identifies the fixed package as installed. A03 says the service predates the update and has not restarted, while A01 says the correction requires a restart. A05 expressly withholds which code the running process uses.

Those statements do not justify declaring the service corrected. They also do not justify inventing a particular loading mechanism or asserting an exploit occurred. The useful conclusion identifies the installed-package fact, the unmet documented restart condition and the unresolved runtime evidence.

A proposed next decision can ask the responsible owner for an authorized runtime-verification and change plan. It is not permission for the learner to restart the service. Keep the action conditional and preserve its approval and recovery requirements.

### Case B: applicability is supported without exploitation

B01 is expressly authoritative for the running affected build. B02 and B03 support the feature and user prerequisites. This supports an applicability match to the fictional advisory under the supplied assumptions.

B04 bounds the system to training-only synthetic exports, and B05 says no exploit or cross-user test ran. The supported concern remains the advisory's cross-user export consequence in that stated context. Do not turn it into demonstrated disclosure, production compromise, code execution or a numeric urgency score.

### Cases C and D: two different limits

C supplies an open endpoint and conventional service label, plus an unsupported recollection. It omits distributor, exact build, configuration and user model. The match is insufficiently established, not confirmed affected and not confirmed safe. C04 also forbids further requests for the paper task.

D supplies fresh runtime identity for the fixed build, a post-installation restart and correlation to the exact service. That supports a narrow not-affected conclusion for TRAIN-ADV-A, not a declaration that the application has no vulnerabilities. State the advisory boundary explicitly.

### Resolve disagreements without erasing either source

If two records conflict, preserve both labels and ask whether they refer to the same installation, process and time. A newer record may be more relevant, but its date alone does not prove its authority or scope. A record about another instance does not resolve the assessed instance merely because the names resemble each other.

The least intrusive clarification is often an owner-provided authoritative inventory or configuration record. Propose the evidence category on paper; do not query an internal system or access records without permission.

### Write a defensible conclusion

Use four elements: applicability label, supporting record labels, remaining uncertainty and next authorized decision. State which conditions are supported rather than writing only vulnerable or not vulnerable. Do not call an alert a false positive until sufficient contrary evidence establishes that conclusion.

No CVSS vector or real CVE is needed. A vulnerability identifier refers to a record, not to a finding on an asset, and none is supplied for these invented products.

### Human-led AI critique

First construct your own condition table. If an approved assistant is available, provide only A01 and one fictional case and ask which links are supported and which conclusions overreach. Reject invented package output, build-order assumptions, new CVEs or exploit suggestions. Manual critique is equally valid; never supply real inventory or credentials.

### Formative questions with explained answers

1. Does a matching upstream family prove applicability? No. Distributor fixes and exact builds matter.
2. Does an installed update prove the process uses it? No. Runtime state and required activation steps are separate facts.
3. Does Case B establish exploitation? No. It supports affected conditions, and the pack expressly supplies no exploit test.
4. Is Case C a confirmed false positive? No. The evidence is insufficient in both directions.
5. What does Case D establish? A narrow advisory/build conclusion under its supplied runtime evidence.

Technical basis: Red Hat Security Backporting Practice, https://access.redhat.com/security/updates/backporting . Real vendor guidance explains the practice, not the status of these fictional assets. No live applicability check or learner execution is claimed.
