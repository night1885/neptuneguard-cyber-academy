# API authorization — learner worksheet

Draft blank worksheet for the [fictional case pack](API-AUTHORIZATION-CASEPACK.md). Paper analysis only, not a live API test plan or execution record.

| Case | Object-level decision and rule | Property-level decision and rule | Function-level decision and rule | Missing facts and limits |
|---|---|---|---|---|
| A — own draft | | | | |
| B — another student's draft | | | | |
| C — submitted own record | | | | |
| D — protected/unknown properties | | | | |
| E — unassigned instructor | | | | |
| F — bulk export function | | | | |
| G — missing trusted context | | | | |

## Proposed synthetic tests — not executed
For two cases, specify the fabricated subject, record, action and fields; the expected decision; a legitimate positive control; and a negative boundary case. State what would remain untested even if both checks passed. Do not send these proposed cases to a real service.

## Reflection
1. Explain why valid object access does not authorize every field.
2. Explain why reading one assigned-course record does not grant a separate bulk function.
3. Distinguish a trusted subject attribute from an unverified request claim.
4. Explain this case pack's explicit whole-request rejection rule for mixed allowed/forbidden fields.
5. State one conclusion this paper exercise cannot establish about a real API.

Keep all answers fictional. No numeric pass mark, automated completion, authorization or award is defined. Do not commit a completed personal worksheet; use only the approved private submission process when available.
