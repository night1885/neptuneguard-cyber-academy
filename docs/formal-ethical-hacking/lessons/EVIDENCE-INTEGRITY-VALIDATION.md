# Synthetic evidence integrity — local author validation

Draft batch: EH-EVIDENCE-02, a synthetic sample and a blank handling worksheet. No real evidence collection, imaging, monitoring, hosting, publication, academy-runtime or Community Learning change is included. The prior reading-route index is not modified by this batch.

## Executed checks
In a temporary local directory, the exact sample bytes were written, copied with shutil.copyfile and hashed using hashlib.sha256 over bytes. The sample was 77 bytes with LF endings and a final newline.

Source SHA-256: abdc6e55ddb862613f967cb841744d2b7135aced7261f9bdcf5eed702525bdb7
The initial copy matched that digest. Appending the exact bytes for Reviewed copy only. followed by LF changed the copy digest to 60bee2df9d25e588f088b26a5cf59665a66608acfbc1b32014f2810502917fc9. A direct source-byte recheck confirmed that the source remained unchanged during this author check.

The checks covered the core copy/hash/change operations. The full interactive novice workflow, existing-file guard, material transfer, editor behavior and worksheet process were not reproduced end to end. Generated source files are course fixtures, not acquired forensic evidence.

## Limits
No origin authentication, signature verification, live acquisition, metadata preservation, custody process, legal admissibility, tamper attribution, supported guest route or privacy/accessibility workflow was validated. Reading all bytes into memory is intentionally limited to this small sample. The exercise is not a secure file-handling implementation for adversarial directories.

A downloadable JSON author-check record was generated separately and is not automatically a committed CI artifact or student submission.

## Before release
Reproduce on supported guests and document line-ending differences without modifying preserved sources. Test the fresh-directory and import-shadowing guidance with beginners. Review evidence minimization, actual private submission/retention policy and assessor calibration. Integrate navigation and metadata through a separately reviewed update; existing publication and authorization gates remain unchanged.

Source basis:
https://docs.python.org/3/library/hashlib.html
https://csrc.nist.gov/pubs/sp/800/86/final
