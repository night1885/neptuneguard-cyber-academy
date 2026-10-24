# Canonical catalogue-to-index coverage

Standalone maintainer check for simple reading links, not release approval. Requires a trusted repository checkout and Python 3.9+. This batch adds no CI workflow and does not alter the combined authoring runner's allowlist.

## Commands
From the repository root:

```sh
python3 -B docs/formal-ethical-hacking/authoring/check_catalogue_coverage.py
```

For its isolated regression tests, change into the authoring directory and run:

```sh
python3 -B -m unittest -v test_check_catalogue_coverage
```

The checker reads curriculum-catalogue.json and README.md relative to its own location, compares catalogue IDs with simple local lessons/<id>.md links and returns nonzero for missing links or linked canonical IDs absent from the catalogue. Empty/malformed lesson lists, invalid or duplicate IDs and input-reading errors fail rather than silently succeeding. It modifies no file and executes no fixture.

## Exact scope
Canonical IDs use the existing EH group / two-digit-or-capstone naming pattern. Supporting worksheets, bridges and case packs do not match that pattern and are not counted as extra lessons. Link destinations are URL-decoded and POSIX-normalized; local fragments do not change the matched file path. External destinations do not count as local reading coverage. Plain ID mentions and image references do not count. Simple column-zero triple-backtick fenced examples are removed before matching.

This is not a full Markdown parser. Reference-style links, indented or tilde code fences, inline-code semantics and arbitrary HTML navigation are not fully interpreted. Use the documented simple inline link style for this index. Duplicate links are harmless set members; the check does not impose a reading order or exactly-one-link rule.

It does not establish that target files exist, fragments work or links stay inside filesystem boundaries. Continue using check_index.py for its local-file checks and check_catalogue.py for its separate metadata/prerequisite checks. This new check does not validate publication flags, the complete catalogue schema, semantic prerequisites, educational sufficiency, accessibility or runtime authorization.

## Local execution record
All 12 test_check_catalogue_coverage methods passed locally on Python 3.12.8 using synthetic catalogue/text inputs. They cover complete/missing links, prose mentions, external links, normalized encoded local links with fragments, duplicate/invalid IDs, malformed root/list cases, supporting documents, uncatalogued canonical links, fenced examples and image references. The malformed-input method contains multiple subcases, not additional independent unittest methods.

The standalone command has not been executed against the repository's actual README/catalogue in this creation batch, and no complete checkout or GitHub CI run was performed. Do not report those synthetic unit tests as a new 36-entry repository coverage result. The earlier index reconciliation remains a documentation review until this command is run against the intended checkout.

## Integration boundary
The combined runner and course README are unchanged. Run this explicit named command separately; it is not silently enabled by existing authoring commands. No learner progression, enrolment, lab access, award, hosting, runtime integration or publication change is made.
