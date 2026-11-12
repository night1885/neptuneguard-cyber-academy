# EH-WEB-09 — Validate an upload policy without trusting metadata

Draft offline practical, not published. Requires EH-WEB-08 and its prerequisites, including path-boundary and Python-reading work. Proposed catalogue ID, not runtime registration. Use only your own clean approved guest and the supplied synthetic fixture.

## Outcomes
Distinguish a client filename, declared content type, byte prefix and complete file validation. Translate an explicit policy into allow/deny cases, reproduce a metadata-trust defect, make a narrow repair and preserve legitimate cases. Explain the separate authorization, storage and serving decisions a real upload pipeline requires.

## Scope and preparation
Copy only [upload_lab.py](../fixtures/upload-policy/upload_lab.py) and [test_upload_lab.py](../fixtures/upload-policy/test_upload_lab.py) into a fresh disposable guest directory through the approved material-transfer route. Read both files first. Python 3 with dataclasses and unittest is required; the repair can use standard-library re. No pip, sudo, browser, HTTP client, server or network is needed. Missing tools/transfer guidance are blockers, not permission to reconnect an isolated guest.

The fixture operates on well-formed UploadRequest records containing string filename/type fields and a bytes buffer. It reads no credential store, opens no socket and writes no uploaded file. Filenames with path-like text are inert input values, never filesystem operations. Do not add real documents, malware, active content, web shells, archives, executable samples or an external target. Never deploy or import the starter into academy runtime.

## 1. Separate the claims
A filename is a client-controlled name, not a safe storage path. A declared content type is also a claim; matching image/png does not establish the actual content. A known byte prefix is a limited observation about the first bytes, not proof that a complete image is valid or harmless. A size check over an already supplied buffer is not an early streaming/resource quota.

OWASP recommends layered controls rather than relying on client Content-Type or a signature alone. A real design must additionally address authorized upload/download, content inspection appropriate to the format, application-generated storage names, storage isolation, safe serving, limits and operational handling. This practical implements none of that infrastructure.

## 2. Read the exact teaching contract
The function returns True only when all of these conditions hold for the supplied well-formed record:

- The filename fully matches `[A-Za-z0-9][A-Za-z0-9_-]{0,39}\.png`: a one-to-forty-character ASCII stem starting with a letter/digit, then lowercase .png. No directory component, extra dot or suffix is accepted.
- The declared type is exactly image/png. This required comparison is not trusted proof of content.
- The byte-buffer length is at least the eight-byte PNG_PREFIX and at most MAX_BYTES, which is 1024 in this tiny exercise. The upper bound is inclusive and is not a production upload limit recommendation.
- The buffer begins with the exact supplied PNG_PREFIX bytes.

Everything else within this input contract returns False. The function must not alter the request or its buffer. There is no case normalization, protocol decoding, archive unpacking, filesystem resolution, storage or serving step in this model. Do not invent a real endpoint contract from these fields.

The nominal sample is PNG_PREFIX followed by the literal synthetic bytes DEMO. It is not a complete valid PNG image. Even an accepted sample proves only that these toy checks match the stated contract.

## 3. Predict before running
Read admit_demo_upload and each visible test. The starter checks only the declared type. Explain why a matching declaration can coexist with a wrong suffix, path-like name, oversized buffer, absent prefix or empty body. Treat these as separate missing policy conditions rather than calling every failure a demonstrated exploit.

From the disposable fixture directory run:

```sh
python3 -B -m unittest -v test_upload_lab
result=$?
printf 'test status=%s\n' "$result"
```

Capture the real test result and the saved status immediately. The final printf normally succeeds even when unittest failed; its shell status is not the saved test status. There are ten independent unittest methods, not ten subcases inside one method. The author observed seven assertion failures and three passing methods for this starter; your run must be recorded honestly rather than replaced by that expectation. An import error is not successful defect reproduction.

## 4. Repair the decision, not the expectations
Edit only upload_lab.py. Combine the filename full-match, exact declared type, inclusive byte-length bound and prefix check. Use re.fullmatch rather than a loose substring or suffix search. Preserve the nominal allowed case and the exact-size allowed case; denying everything is not a repair. Keep supplied test expectations intact.

Do not blacklist a few dangerous-looking suffixes, coerce arbitrary inputs to strings, trim names until they fit or silently reinterpret the case policy. A different real application's normalization rules must be specified before validation; this model deliberately accepts only its narrow representation. Do not add file writes, image decoding or internet checks to make the suite pass.

Rerun the same named suite and record the before/after results plus a minimal diff. A temporary author repair passed all ten methods locally, but the deliberately incomplete starter is what this repository supplies for learning.

## 5. Independent boundary work
Add a backslash-containing filename case and a case whose buffer is only PNG_PREFIX. Predict both from the exact contract. The latter illustrates why matching a header and minimum length does not prove a valid image: do not strengthen the written policy after seeing the result or call the accepted bytes safe to serve. These added learner cases were not executed in the creation batch.

For a paper design review, draw a real pipeline: authenticated request and exercise/business authorization; early resource bounds; normalized metadata validation; quarantine/content handling; generated storage reference; controlled retrieval; and retention/deletion. Mark every stage absent from the fixture. Discuss why authorizing a learner to submit one record does not authorize reading another learner's attachment. Do not implement or contact a real upload service for this task.

## Deliverables and limits
Submit your policy table, genuine starter/repaired results, minimal repair diff, independent predictions/cases and a pipeline diagram through the approved private evidence workflow. Use synthetic values only. Report this as an in-memory policy repair, not a remote upload compromise, image-validation implementation, malware scan, sandbox or secure storage system.

The visible tests cover selected examples, not complete input-schema validation or assurance for every filename, parser and platform. Student-guest reproduction, assessor calibration, accessibility and formal scoring remain pending. The existing integrated web practical capstone still covers EH-WEB-04 through EH-WEB-06 only; this lesson does not expand its rubric. No learner access, hosting, deployment or award follows.

Source: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
See [author validation](UPLOAD-POLICY-VALIDATION.md) for the bounded local execution record.

## Expanded teaching: write the contract first, then test the claims one at a time

This supplement uses only the existing in-memory upload fixture and its synthetic records. It adds no real file, archive, executable sample, active content or external service. The predictions below come from the lesson's stated contract and the starter source, not from your run.

### Treat each input as a separate claim

An upload request carries three client-supplied things: a filename, a declared type and the bytes. Each is a claim by the sender. None is evidence of the others. The starter trusts only the declared type, so any record whose declaration reads as the allowed type passes, whatever its name or bytes.

OWASP's file upload guidance makes the same point: the Content-Type is supplied by the client and can be spoofed, so it should not be the control, and signature checking is useful but not sufficient alone. Read the lesson's four conditions as four independent claims to test, each of which can fail while the others hold.

### Walk the contract condition by condition

The filename condition requires a full match of the stated pattern. Think about what each part excludes: a leading character that is not a letter or digit, any character outside letters, digits, underscore and hyphen, a stem longer than forty characters, a different or upper-case suffix, and anything after the suffix. A path separator of either kind is outside the allowed characters, so a path-like name fails without any filesystem logic.

The type condition requires the exact string. The size condition requires a length at least as long as the prefix and no more than the inclusive limit. The prefix condition requires the buffer to start with the exact supplied bytes. For each, decide in advance what boundary values test it: the exact limit, one byte over, an empty buffer and a buffer that is only the prefix.

### Why full-match matters

Matching a pattern is not the same as matching the whole value. A search anywhere in the string would accept a name that merely contains an acceptable fragment. Python's fullmatch requires the entire string to match, which expresses the whole-name rule directly. The lesson asks you to use it for that reason, not because other forms are always wrong.

### A header check is an observation about the start

The prefix condition looks only at the first bytes. A buffer that is just the prefix passes the prefix and minimum-length conditions and still is not a valid image. The lesson's added case makes this concrete. When you see it accepted, do not tighten the written policy to make the result feel safer; instead, record that the model accepts it and explain what the model does not check.

The nominal sample is the prefix followed by a few literal bytes. It is not a complete image. Accepting it shows that these toy conditions agree with the contract, nothing about image validity or safety to serve.

### Classify the starter's failures

The starter checks only the declared type, so records that differ in name, size or prefix still pass when the declaration matches. That is a missing-condition failure for each of those dimensions, not seven separate exploits. The lesson reports ten independent test methods; record your own count of failures and passes rather than the author's, and keep import or setup errors separate from assertion failures.

### Preserve the allowed cases

A repair that returns false for everything would turn the failing tests green only for the denial cases and break the allowed ones. Your repair must still accept the nominal record and the exact-size record. Do not blacklist a few suffixes, convert arbitrary inputs to strings, trim long names until they fit or reinterpret case. Each of those changes the policy or hides a rejection. If a real application needs normalization, that must be specified before validation, and it is outside this model.

### Place the fixture inside a real pipeline

On paper, mark where a real upload flow would apply the controls the fixture lacks. OWASP lists them: only authorized users may upload, size limits apply, filenames are generated by the application rather than trusted, files are stored outside the web root or elsewhere isolated, and appropriate content inspection and sandboxing are used. Label each stage absent from the fixture.

Include authorization in the diagram. Permission to submit one record does not grant permission to read another learner's attachment. The size check on an already supplied buffer is not an early limit on how much data a service accepts. These are separate stages with separate failure modes.

### Keep the reported claim narrow

What you have shown is a local policy function repaired against selected examples. You have not built an upload service, validated images, scanned for malware or secured storage. Do not describe the result as a remote upload compromise or as a secure upload implementation.

### Bounded human-led AI review

Write your own policy table first, with one row per condition and one boundary value for each. If an approved assistant is available, provide only the synthetic function and the contract text, and ask it to list which conditions each of your cases exercises and what the model never checks. Reject suggestions to add real samples, decoders or network checks. A manual pass satisfies the same objective, and no real documents should be supplied.

### Formative questions with explained answers

1. Why is the declared type insufficient? The sender controls it.
2. Why use a full match for the filename? The whole name must satisfy the pattern, not just a fragment.
3. Does passing the prefix check make a file a valid image? No. It observes only the first bytes.
4. Why not repair by returning false for everything? Allowed records must still be accepted.
5. Does this fixture authorize who may upload or read? No. Those are separate pipeline stages.

Technical basis: OWASP File Upload Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html . No new test run, image validation, storage behavior, learner-platform reproduction or assessor calibration is claimed by this supplement.
