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
