# Owner-review output verification

Run from the repository root after build_review.py has created a new output directory:

    python3 -B -m unittest discover -s docs/formal-course-authoring -p test_verify_review.py -v
    python3 -B docs/formal-course-authoring/verify_review.py --output ../neptuneguard-course-review

The verifier reads only the selected source inputs, manifest and three known output files. It does not import or execute teaching code, start services, install tools, modify the checkout or rewrite the output. Missing/extra output entries, symlink files, source bounds and duplicate JSON keys are refused. Use a controlled owner checkout; this is not an atomic forensic collector or a hostile-filesystem sandbox.

It reconstructs expected review sections from the current manifest and selected source bytes independently of the builder's rendering function. Checks cover legacy Git pins; source audit paths, hashes, byte counts and counts; canonical selection/order; the existing SOC teaching-field projection; complete shared text in both books; complete incident text in IR; navigation, labels, owner warnings, fixed style and the expected inert HTML structure. Allowed teaching fields are not a guarantee that their prose contains no sensitive information. Source selection is not semantic curriculum review.

This verifier is intentionally coupled to the assembler's current output format. A deliberate format change needs a reviewed verifier/test change. It is not a general HTML sanitizer, publication permission gate, protected learner reader, assessment engine or certification of the curriculum. It cannot establish original-source truth, historical Markdown provenance, complete legal custody, full student-platform reproduction or independent learner performance.

The new suite uses miniature synthetic checkouts and the actual unchanged builder. It includes source omission/mutation, forged audit data, private SOC field injection, activated markup/links, malformed navigation, owner warning removal, truncation, output symlinks, read-only comparison and CLI root resolution. All 24 selected new tests passed locally. The existing named source tests and native jobs remain enabled; their current hosted success does not count as execution of this new code. Full actual checkout verification is delegated to the proposed CI step and must be inspected after the commit.

CI runs the new named suite, assembles the actual checkout and verifies it before the existing owner-review artifact upload. Both native jobs, read-only repository permissions, credential-persistence settings and seven-day retention remain unchanged. Do not write extra files into the three-file book output directory before verification. No catalogue/registry/fixture/runtime/Community Learning, learner permission, production, merge or deployment change is introduced. Keep PR #59 draft and retain one consolidated release per complete course.
