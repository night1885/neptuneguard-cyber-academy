# W02 — field and revision case worksheet

Draft paper exercise after [field teaching](STANDALONE-WEB-W02-FIELDS.md). All facts are fictional. No request, fixture execution or real record is needed. For each case identify the contract, independent decisions, expected result, supporting facts, unknowns and a legitimate/forbidden retest pair.

1. Dictionary contract: changes contain title and grade. A proposed repair returns a new dictionary with both changes. Explain why unchanged source data does not establish field authorization and what whole-request rejection requires.
2. Dictionary contract: changes contain title and an unknown future field. A repair blocks grade and owner_id only. Explain how an explicit allowlist differs from that denylist. Would a protected key equal to its old value be accepted under this contract?
3. Dictionary contract: an empty changes object and a title-only changes object. Explain why rejecting all updates is not correct. State what value validation remains unspecified.
4. Application contract: the enrolled owner of a draft supplies only text and the correct revision. Contrast with the same update by a nonowner and with a body that also changes owner. Field, object and revision checks answer different questions.
5. Application contract: an accepted edit advances revision 0 to 1; the next edit expects 0. Explain the conflict goal and what this sequential example cannot show about true concurrent writers or a retry after a lost response.
6. Application contract: a simulated commit exception occurs. Explain why a success response emitted before commit would misrepresent the result, and why a selected rollback test does not validate all durable-storage failures.
7. A learner combines the two fixture field sets and declares title, body and text universally editable. Explain the contract error and the additional evidence needed before designing any real endpoint.

Submit a short policy matrix and one repair/retest rationale through an approved private route only. Distinguish proposed tests from actual observations. Use no real identities, values or credentials. This worksheet grants no grade, permission, progression or completion.
