# EH-MODEL-02 — Turn a threat into a bounded test case

Draft paper exercise, not published. Requires EH-MODEL-01 and EH-ASSESS-03. Proposed ID only. Design tests for the fictional scenario; do not execute them against the academy, a website or another student's system.

## Outcomes
Connect an asset and threat to a control, expected behavior, minimal verification, evidence and a justified conclusion.

## Build a traceable chain
For each selected threat record the asset, flow, threat precondition, proposed control, test objective, setup, allowed action, expected observation, evidence and limitation. Each link matters: a tool output that does not address the objective cannot validate the control.

Distinguish a control's design from its implementation and its observed effect. A design rule can require an ownership check; a unit test can exercise a decision function; an integration test can examine enforcement at a real resource boundary. These are complementary evidence levels, not interchangeable proofs. The earlier offline fixtures are not the fictional application implemented here.

## Include permitted and denied behavior
Testing only a denied action can reward a broken application that denies everyone. Testing only an allowed action can miss cross-user access. A useful case pair includes a legitimate operation and a closely related forbidden operation, with explicit identities and synthetic resource ownership.

Worked paper example: prepare two synthetic students enrolled in the same fictional course and a draft owned by the first. The desired behavior is that the owner can read it and the other student cannot. Before any future execution, the lab would need approved test identities, a reviewed fixture, exact routes, request limits, recovery and evidence rules. This lesson specifies none of those as live targets.

Define the oracle: what observation would distinguish correct behavior from incorrect behavior? A status code alone may not show whether sensitive content was returned or a state change occurred. Conversely, collecting an entire unrelated dataset to prove one access decision is disproportionate. Plan minimal synthetic evidence, not real data acquisition.

## Handle incomplete outcomes
For each proposed test distinguish supported, contradicted, inconclusive and not executed. A timeout is not a successful authorization test. An environment error is not proof that the control works. A missing backend log might limit correlation without proving tampering. Avoid forcing an answer when the evidence cannot separate plausible explanations.

## Prioritize with a reason
Select a small initial set based on the protected assets, plausible exposure, known uncertainty and authorized constraints. Explain why these tests answer important questions. Do not invent CVSS scores, universal risk rankings or permission to expand a test because it might find more issues.

A future retest should preserve the original claim, permitted method and comparison basis while recording the approved change and remaining gaps. Link it to the finding/retest worksheet rather than claim that a model alone fixes anything.

## Independent assignment
Choose three threats from your model. For each create one positive and one negative or boundary test, and explain its oracle and limits. Include at least one case whose correct next result is clarification rather than immediate execution. Keep all steps paper-based and synthetic.

Explain which earlier fixture could teach a related concept and why passing that fixture would not validate this fictional application's control. Use the trust-boundary chain to avoid treating a SQL parameter as an ownership check or a file-path decision as a complete authorization system.

## Review and limits
Submit the traceability worksheet and a short rationale. Review scope, identity/resource setup, preservation of legitimate behavior, minimal evidence, explicit unknowns and outcome interpretation. Numeric grading and assessor examples remain pending. No actual application, test automation, deployment or formal permission is created.

Source: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html


## Extended teaching: make the claim testable before choosing a tool

This is additional paper-based teaching, not permission to execute a test. Keep the fictional application, invented identities and synthetic records separate from the academy and from earlier executable fixtures.

A threat statement describes something that could go wrong. A test objective asks one answerable question about the proposed protection. “Someone could read another student's draft” is a threat; “Does the read decision reject an enrolled non-owner while preserving the owner's access?” is a test objective. The second statement identifies a decision boundary and includes legitimate behavior. It does not assume that enrollment establishes ownership.

Write the claim before the procedure. For example: “For synthetic draft D1, owner A is permitted to read; enrolled non-owner B is denied; no draft content is disclosed to B.” A useful paper test must state how ownership and enrollment are established in its hypothetical setup. If the setup merely labels A as owner without specifying a trusted source for that fact, mark that setup detail unresolved. A convincing-looking procedure cannot repair an ambiguous claim.

## Worked paper comparison: three evidence levels

Consider three proposed observations about the same fictional draft:

- A design document says every read checks ownership.
- A decision-function fixture returns allow for A and deny for B.
- A hypothetical integration test observes the resource boundary applying that decision to D1.

These observations answer different questions. The document states intent. The fixture examines a particular implementation under its supplied inputs. The integration test could examine whether the application actually calls the decision at the relevant boundary. None can be silently substituted for another. A correct helper that is bypassed by a resource handler does not establish application enforcement.

For your worksheet, record the identity source, resource, proposed action, expected result, minimum evidence and remaining uncertainty in separate fields. Keep “expected” distinct from “observed.” For an unexecuted paper case, the observed field must say not executed rather than repeat the expected result as though it happened.

## Exercise: repair a weak oracle

A proposed negative case says: “B receives an error page, therefore authorization works.” On paper, list what is missing. Then rewrite the oracle so it checks the relevant denial without collecting unrelated data.

Explained answer: the error page alone does not establish which identity was used, whether the request concerned D1, whether content was disclosed elsewhere in the response, or whether an unintended state change occurred. A stronger proposed oracle associates the synthetic identity and resource with the response decision, absence of the protected synthetic marker and absence of the prohibited state change. Define only the evidence needed for this single claim. Do not plan acquisition of other students' records.

Add the paired owner case. If both A and B are denied, the negative result may look protective while legitimate behavior is broken. That pair contradicts the combined requirement; it is not a successful authorization repair.

## Troubleshooting the reasoning

If the proposed test has no approved identity setup, stop at clarification. If the environment prevents any meaningful observation, classify the case as inconclusive rather than supported. If the test has not been run, classify it as not executed. If the evidence directly conflicts with the stated expected behavior, record contradicted and preserve the narrow claim rather than widening it to “the whole system is insecure.”

For a hypothetical retest, retain the original claim, identities, resource relationship and comparison basis. Record the approved change separately. Changing both the implementation and the expected result until they agree destroys the original comparison.

## Bounded human-led AI critique

You may give an AI assistant an invented worksheet containing A, B and D1 and ask it to identify an ambiguous oracle or a missing positive case. Do not supply credentials, private evidence or real resource identifiers. Review every suggestion yourself. Reject suggestions that introduce executable requests, additional targets or broader data collection. The deliverable is your revised paper reasoning, including one accepted and one rejected suggestion with reasons; AI output supplies neither evidence nor authorization.
