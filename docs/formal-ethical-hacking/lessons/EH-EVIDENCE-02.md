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

## Expanded teaching: compare bytes, then explain what the comparison cannot establish

This supplement remains limited to the existing synthetic sample and the original one-run working-copy procedure. It adds no acquisition tool, real evidence source, network transfer or script change. Expected relationships below are reasoning aids, not a transcript of your execution.

### Identify the object being hashed

SHA-256 operates on bytes. The display of a text file is one interpretation of those bytes, and an editor may hide distinctions such as line endings or a final newline. The exercise therefore reads file bytes rather than silently normalizing text.

Record the exact source reference, algorithm and comparison stage. A digest without a labelled input can be technically correct yet answer the wrong question. Comparing the changed working copy with a digest of a different file does not establish anything about the intended source.

The original program prints a hexadecimal representation of the digest. That is a representation for reporting, not encryption of the input and not a replacement for the file. Python's hashlib documentation distinguishes binary digest output from its hexadecimal representation.

### Read the existing procedure as four claims

First the program saves the source bytes in memory. Then it copies the source content into a fresh working filename. It compares source and copy digests before deliberately appending a known line to the working copy. Finally it rereads the source and compares its bytes with the saved original.

These checks concern different stages. Matching initial digests support consistency of that copy. The changed-copy digest concerns a later deliberately modified object. The final source comparison checks whether the source bytes still equal the original read during this run.

Do not describe the final comparison as enforced read-only storage. The program and the lesson instruct preservation, but they do not make the source immune to modification by another process or establish a hostile-environment acquisition procedure.

### Predict the relationships, not invented digest strings

An unchanged initial copy should produce the same digest as the source. Appending the known line ordinarily produces a different digest. The source should remain equal to the originally read bytes if the procedure ran as intended.

Write those relationships before executing the original script. Do not invent a hexadecimal string or copy an author's result into your evidence table. Actual values belong to your own identified run, with a note explaining which object each represents.

The guard rejects an already existing working path or symbolic link in this controlled exercise. If it stops you, use the original instruction to choose a fresh exercise directory rather than overwriting work or deleting an unexplained file. The guard is not a race-free creation design for an attacker-controlled directory.

### Interpret a mismatch without accusing a cause

Different digests demonstrate inconsistency relative to the compared bytes or reference. They do not uniquely identify malicious tampering. Normalization during transfer, deliberate editing, a different selected file or corruption can produce the same comparison outcome.

Start with provenance and process: which file was selected, which bytes were hashed and which transformation was documented? Preserve the unexpected original instead of editing it to match a desired reference. Otherwise the comparison loses the very difference that needs explanation.

Similarly, a match does not establish who created the content, when its claimed event occurred or whether the content is true. Byte consistency, source authenticity and factual accuracy remain three separate questions.

### A trusted reference is a separate input

A locally generated digest can help a later comparison only if its association with the intended source is preserved. If both a file and its reference are replaced, recomputing a match alone does not establish provenance. The lesson does not create an independent attestation service or a digital-signature system.

Do not treat a hash as a way to make sensitive input harmless to share. This exercise uses synthetic content, and future real evidence would still need approved recipients, channels, access controls and retention rules.

### Content copying is not forensic imaging

The original helper copies content for a tiny file. It does not preserve every filesystem attribute, acquire deleted space or create a full system image. Reading all bytes into memory is deliberately suitable for this small sample, not a general large-acquisition method.

Keep the report proportional: an identified synthetic sample was copied and deliberately changed in a working file. Do not describe that as a forensic acquisition of a device or imply legal admissibility from successful hashing.

### Record only the handling that happened

A handling worksheet should distinguish source, copy, transformation and final state. Record real actions and relevant verified times if available. Do not fabricate earlier custodians, signatures or timestamps to fill a professional-looking form.

The private submission procedure still governs the exercise output. A future real transfer would require actual recipient authorization and organizational policy; this supplement supplies neither. No real transfer is required to answer the worksheet.

### Human-led AI critique

Write your own explanation of a matching pair and a mismatching pair first. If an approved assistant is available, provide only fictional labels and the comparison relationships, not real files or organizational evidence. Ask it to separate byte consistency, provenance and truth. Reject claims that a match proves authenticity or that a mismatch uniquely proves an attack. Manual review serves the same purpose.

### Formative questions with explained answers

1. Why read bytes rather than normalized text? The comparison concerns the actual byte sequence, including line endings.
2. Does a digest encrypt the sample? No. It summarizes the input under a specified algorithm.
3. Does a mismatch prove malicious editing? No. Several transformations or selection errors can explain it.
4. Does an unchanged-source comparison make the file write-protected? No. It is an observation, not enforcement.
5. Does copying content preserve a complete forensic image? No. The procedure has a much narrower scope.

Technical basis: Python hashlib documentation, https://docs.python.org/3/library/hashlib.html , and the preservation/documentation concepts in the NIST reference already cited by the lesson. No new script run, forensic acquisition, real handoff or learner-platform execution is claimed.
