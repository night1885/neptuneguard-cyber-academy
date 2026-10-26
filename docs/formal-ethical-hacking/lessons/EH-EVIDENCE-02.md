# EH-EVIDENCE-02 — Check byte consistency and document handling

Draft offline practical, not published. Requires EH-EVIDENCE-01 and the Python bridge in EH-WEB-04. Proposed ID only; not runtime registration. Use a student-owned clean guest and only the supplied synthetic text sample.

## Outcomes
Compute a SHA-256 digest over file bytes, compare a copy, detect a deliberate working-copy change and explain the limits of hashes and handling records.

## Scope and setup
Copy only fixtures/evidence-integrity/sample.txt into a fresh disposable exercise directory through the approved material-transfer procedure. Its content is entirely synthetic and describes no real event. Do not substitute real logs, personal documents, disk images, credentials or organizational evidence.

Python 3 with hashlib, pathlib and shutil is required. No pip, sudo, network or specialized acquisition tool is needed. Confirm the correct guest and directory before starting. Do not run the exercise in a shared or personal-document directory.

## Understand the claim
A cryptographic digest is a fixed-size value computed from input bytes using a specified algorithm. Matching SHA-256 digests provide strong evidence of byte consistency under the method's assumptions; this is not a mathematical promise that distinct inputs can never share a digest. Changing bytes ordinarily changes the digest.

A digest does not encrypt the input, identify who created it or show that its contents are true. If an attacker can replace both the file and its reference digest, a fresh match alone does not establish provenance. An independently trusted reference and appropriate handling records answer different questions from local hashing.

For this exercise the source text uses ASCII content and LF line endings, including a final newline. Copy/paste, line-ending conversion and editor normalization can alter bytes while leaving text visually similar. Record an unexpected baseline instead of editing the source until it matches an expected value.

## Preserve and inspect a working copy
Read the following program before executing it as Python in your disposable directory. It reads only sample.txt, creates working.txt and appends a known line only to that working copy. Run it once. The guard prevents ordinary reuse of an existing working filename in this controlled exercise; it is not a race-free secure-file-creation design for hostile directories.

```python
from pathlib import Path
from hashlib import sha256
import shutil

source = Path('sample.txt')
working = Path('working.txt')
if working.exists() or working.is_symlink():
    raise RuntimeError('Choose a fresh exercise directory; do not overwrite work')
original = source.read_bytes()
shutil.copyfile(source, working)
source_digest = sha256(original).hexdigest()
copy_digest = sha256(working.read_bytes()).hexdigest()
print('source', source_digest)
print('copy', copy_digest)
working.write_bytes(working.read_bytes() + b'Reviewed copy only.\n')
print('changed copy', sha256(working.read_bytes()).hexdigest())
print('source unchanged', source.read_bytes() == original)
```

Save this as your own small local exercise script if needed; do not name it hashlib.py, pathlib.py or shutil.py, which could shadow the standard-library imports. Read-only treatment here is an instruction, not an enforced write-protection mechanism.

The read_bytes approach is appropriate to this tiny supplied sample, not an efficient method for arbitrary large acquisitions. copyfile copies content; it is not forensic imaging or a claim that source metadata has been preserved. Do not adapt this script to acquire a live system.

## Compare and explain
Record the source and initial-copy digests and the changed-copy digest. Explain the byte change and whether the original source changed. Keep both source and changed copy labelled; do not rename an edited file as the original or describe an author's run as your own.

A mismatching digest supports a byte inconsistency relative to the compared reference. It does not uniquely prove malicious tampering: transfer corruption, normalization, selecting the wrong file or intentional editing can also explain it. State evidence and alternatives.

## Preservation and handoff exercise
Complete EVIDENCE-HANDOFF-WORKSHEET.md using synthetic labels. Record the method, algorithm, source reference, copies, deliberate transformation and observed results. A real transfer would need an authorized recipient, approved channel, access restrictions and actual retention/deletion policy; this course document does not invent them. No real transfer is required here.

Handling documentation should record actual actions and verified times when relevant. Do not invent historical custody, signatures or timestamps. A well-formatted worksheet alone does not authenticate evidence or guarantee legal admissibility. Seek the actual organizational process and qualified advice where required; this teaching exercise is not legal or forensic certification.

## Deliverables and review
Submit actual digest observations, method, transformation explanation, bounded conclusions and a completed synthetic worksheet through the approved private workflow. Explain how byte consistency, source provenance and factual truth differ. Formal grading, student-platform reproduction and assessor/accessibility review remain pending.

Sources:
https://docs.python.org/3/library/hashlib.html
https://csrc.nist.gov/pubs/sp/800/86/final

The historical NIST guide informs preservation and documentation concepts, not a recommendation to adopt its historical hash choices unchanged. This practical uses SHA-256. See EVIDENCE-INTEGRITY-VALIDATION.md for bounded author checks.
