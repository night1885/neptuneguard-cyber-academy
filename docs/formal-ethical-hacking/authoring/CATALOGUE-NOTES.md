# Consolidated authored curriculum — maintainer notes

The separate curriculum-catalogue.json describes 36 existing draft lesson/capstone IDs and 64 curated prerequisite edges. It is authoring metadata, not a replacement for home-lab-manifest.json, a complete course specification, a runtime enrolment record or permission to publish. All entries remain unpublished; labs remain student-built. No hosted provisioning, academy-runtime import, Community Learning change or learner interface is introduced.

## Meaning and limitations
A lesson filename is derived as lessons/<id>.md. The prerequisite list captures the principal authored dependencies and transitive learning relationships; individual lesson scope, setup checks, Python bridges, conditional prerequisites, support requirements and publication blockers still govern. EH-EVIDENCE-01's Python route has an additional reading bridge, while its manual route does not require that bridge; this conditional instruction remains in the lesson rather than becoming an unconditional edge.

The catalogue is not a complete content parser. EH-WEB-04's Linux prerequisite is represented by EH-LINUX-03, whose prerequisites cover the earlier terminal lessons. The network capstone includes EH-LAB-05 to cover the earlier lab sequence. The integrated web practical capstone remains limited to EH-WEB-04 through EH-WEB-06 and is not expanded to later practicals. The row order is grouping, not an enforced linear schedule.

## Checks executed
The curated 36-node, 64-edge graph passed the local validator with a supplied filename set. Ten unit tests passed: valid input, duplicate ID, unknown dependency, cycle, missing file, malformed prerequisite list, blocked publication/runtime flags, student-built lab policy, invalid root and Boolean schema-version rejection. These tests used local data and synthetic filename sets. They did not reconstruct a repository checkout, parse every lesson, execute fixtures, run GitHub CI or validate learner progression.

Current lesson IDs were drawn from the repository inventory inspected in this conversation. Semantic reconciliation of every prerequisite statement remains a human review task. The validator detects structural errors, not whether a lesson actually teaches enough to support the next lesson. Passing it does not establish technical correctness, hardware support, assessment readiness or course completion.

## Maintainer commands
Python 3 is required. From the repository root run `python3 docs/formal-ethical-hacking/authoring/check_catalogue.py` to check the catalogue against actual lesson filenames in that checkout. From the authoring directory run `python3 -m unittest -v test_check_catalogue` for the isolated unit tests. Invalid JSON or filesystem errors also produce a nonzero failure rather than a successful validation.

Do not run the intentionally failing teaching fixtures through broad test discovery and interpret the results as application regressions. This checker imports no lesson fixture, makes no network call and modifies no external state. It does not update the README, existing manifest, learner records, awards or deployment. Those require separate reviewed changes and explicit approval.

A downloadable local check record was generated separately and is not automatically committed as CI or learner evidence.
