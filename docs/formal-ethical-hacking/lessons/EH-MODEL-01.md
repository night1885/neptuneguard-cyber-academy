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

## Expanded teaching: map where authority changes before listing threats

Use the existing fictional Cedar Learning Portal scenario only. It is not NeptuneGuard's architecture or a proposed deployment. This supplement adds no account, target, implementation or live inspection and does not authorize testing any system.

### Start with a model contract

Write the model's scope in one sentence: the stated browser, application, relational store, file store, background export worker and collector, with the flows described by S01-S10. Then list the explicit unknowns rather than filling them with familiar products.

The brief supplies no authentication mechanism, queue transport, worker identity, retention period or upload parser. A box that says unknown is more useful than an invented service because it tells a reviewer exactly which decision remains unresolved. No cloud provider, federation vendor or network interface should appear as a supplied fact.

### Distinguish components from assets

A process handles data, a store retains it and an actor initiates permitted interactions under stated capabilities. An asset is the property the design must protect: draft confidentiality, feedback integrity, accountable records or availability for legitimate use.

A diagram can show a file store without explaining which asset its permissions protect. Add that relationship in words. Conversely, an asset list without flows does not show where a control must operate. The model should connect assets to the components and interactions that can affect them.

### Number flows so the reasoning is reviewable

For each directed flow, record its sender, recipient, data category, purpose, governing authority and scenario label. A browser request and its response are different directions. A background job and later artifact retrieval are different operations, not one arrow labelled export.

Distinguish the application-to-relational-store access, the application/worker relationships with file storage, the job handoff and the event flows to the collector. The exact transport for a job is unspecified. Do not draw a named queue protocol merely because it is common in other architectures.

An accessible table can express all of this without a graphic. What matters is that a reviewer can follow the same authority and data transitions, not which drawing tool produced it.

### Locate trust boundaries by assumptions, not geography

A boundary marks a change in what a receiver is entitled to trust. Browser-supplied resource identifiers are data to validate; they are not authority to disclose a record. S03 requires the application to decide access before persistent-record use, but that requirement is not implementation evidence.

The application-to-worker handoff creates questions about identity, permitted records and the validity of the job's scope. Two components on one machine can still have different authority. A network line alone does not establish the boundary, and an internal label does not eliminate it.

### Worked export flow — FICTIONAL

S06 says the worker receives jobs, reads authorized record sets and writes an export artifact. S07 makes the application responsible for deciding who may retrieve it. A conditional threat is that a caller could obtain another subject's export if retrieval treated knowledge of an artifact ID as authority.

The asset is export confidentiality. The relevant flow is retrieval through the application, and the missing-control hypothesis is resource authorization. This is not a supplied vulnerability, an observed request or permission to guess identifiers. S07 is a design requirement whose implementation remains unverified.

Now consider C01, which proposes retries after a course assignment changes. A job valid when created may face changed authority when retried. The model must ask when authorization is evaluated, whose identity the worker uses, what records the job names and which evidence would connect creation, retry and retrieval. C01 does not supply the correct implementation.

### Keep stated controls and evidence apart

S09 says HTTPS is intended on browser-to-application transport, but supplies no validation record or deployed endpoint. The model can label that design intention while keeping certificate verification unknown. It cannot conclude that every link or stored copy is protected.

Similarly, a process box labelled authorization does not establish that error paths, exports and background work use the right decision. Mark the intended decision points and the evidence categories needed to review them, without inventing a running service.

### Write conditional threats that identify a decision

Use actor capability, asset, flow, failed control and consequence. A generic phrase such as information disclosure does not tell the owner where to intervene. A conditional statement about the browser request becoming trusted ownership context does.

For collector flows, ask whether untrusted fields could undermine useful accountability if source context or safe recording failed. Do not invent a particular logging exploit or claim the collector stores secrets. S08 explicitly requires useful investigation context without document contents or session credentials; it does not prove enforcement.

Threat categories can prompt coverage, but they are not a requirement to manufacture every type of threat on every component. Explain why the conditional concern follows from this brief and which assumption would remove or change it.

### Review completeness and change sensitivity

Trace each sensitive asset through its flows and ask where the relevant decision occurs. Include denied operations, background paths and the distinction between creating an artifact and retrieving it. Review the assumption register for facts the diagram quietly depends on.

A change such as C01 requires revisiting the model because authority can vary across time and components. Threat modelling is maintained alongside design change, not completed permanently by drawing a neat overview. The next lesson develops testable claims; this one does not execute them.

### Human-led AI critique

Build your model and threat statements first. If an approved assistant is available, supply only S01-S10, C01 and your fictional table. Ask it to identify invented components, unlabelled assumptions and threats without a named flow or asset. Reject any suggestion to inspect NeptuneGuard or discover an endpoint. Manual comparison with the scenario is equally valid.

### Formative questions with explained answers

1. Does a trust boundary require a network hop? No. It concerns authority and assumptions, including within one machine.
2. Does an intended HTTPS label prove certificate verification? No. S09 supplies a design intention, not that evidence.
3. Why separate export creation from retrieval? They are different operations with different authorization decisions.
4. Is a plausible threat an observed vulnerability? No. It remains conditional until relevant implementation evidence exists.
5. Why does C01 require review? Retrying after changed assignment raises timing and worker-authority questions.

Technical basis: OWASP Threat Modeling Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html . This is a fictional design exercise; no platform architecture change, threat validation or learner execution is claimed.
