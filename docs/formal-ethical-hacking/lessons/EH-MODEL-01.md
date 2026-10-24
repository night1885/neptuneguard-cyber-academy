# EH-MODEL-01 — Map the system and its trust boundaries

Draft paper exercise, not published. Requires EH-WEB-03 and EH-ASSESS-01. Proposed ID only, not runtime registration. This is a fictional design exercise, not a decision about the academy platform or permission to test it.

## Outcomes
Identify assets, actors, processes, stores and flows; distinguish known design facts from assumptions; and explain where trust changes.

## Ask four questions
OWASP presents threat modelling around four questions: what are we working on, what can go wrong, what will we do about it, and whether the result is good enough. A useful model connects these questions rather than producing an isolated list of attack names. This lesson establishes the system view; EH-MODEL-02 turns it into testable claims.

## Decompose the fictional design
Read THREAT-MODEL-SCENARIO.md. Draw or write an accessible equivalent showing each actor, application process, data store and directed flow. Number the flows so a reviewer can refer to them precisely. For every flow identify the data, sender, recipient and trust assumptions. Do not add an internet-facing service or identity provider that the brief does not specify.

An asset is something the system must protect, such as draft confidentiality, grade integrity or service availability. A process handles data; a store retains it; an external actor interacts with the system. A trust boundary marks a change in trust assumptions or authority, not merely a decorative network line. Two components on the same machine can still have different trust responsibilities.

Distinguish claimed design controls from verified implementation. A diagram label saying HTTPS does not prove certificates are validated. A box named authorization service does not prove every resource operation uses it. A client-supplied subject field is not automatically a trusted identity.

## Identify threats as conditional statements
Use this structure: an actor with stated capabilities may affect a named asset through a specified flow if a particular control fails. State the precondition and consequence. 'SQL injection' alone is not a complete threat statement, and a plausible threat is not an observed vulnerability.

A worked fictional example: if the application accepts a request's claimed owner as authoritative, a signed-in student might cause the application to retrieve a different student's draft. The asset is draft confidentiality; the boundary is request data becoming an authorization input. This is a hypothesis about the scenario, not a reported flaw or executed request.

Consider identity confusion, unauthorized modification, unjustified disclosure, missing evidence, unavailable service and excess privilege where relevant. A category prompt can help coverage, but do not force every category onto every component or invent likelihood numbers. Record why a threat is relevant and what is unknown.

## Review completeness
Check whether each sensitive flow has an identified decision point, whether error and background paths are represented, and whether your model distinguishes browser state from server authority. Missing detail belongs in an assumption register with a clarification question. Do not silently fill it with your preferred architecture.

## Deliverables and limits
Submit a labelled model or equivalent table, asset list, trust-boundary explanations, assumptions and at least four conditional threat statements. Identify one change to the scenario that would require revisiting the model. No live inspection, browser request or internal platform access is required.

Formal scoring, accessibility review and student calibration remain pending. No threat-model exercise establishes complete security, grants access or changes the actual academy architecture.

Source: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
