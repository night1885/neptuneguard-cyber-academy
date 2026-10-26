# Formal Ethical Hacking Programme

Status: project definition; curriculum and interface implementation are not complete.

## Scope
Build the formal Ethical Hacking enrolment course first. Incident Response follows after review and acceptance. Community Learning must remain unchanged, including content, catalogue, commands, access rules, progress, XP and badges.

## Learner experience
No learner slash commands. No pop-up/modal-driven application or course navigation. Provide illustrated course cards, clear labelled buttons and an in-place learning workspace. Navigation should update the current private workspace instead of producing a stream of disposable messages. Include Back, Next, Save Progress, Resume Learning, feedback and clear prerequisite states.

Proposed journey: catalogue -> course details -> application -> review/status -> approved dashboard -> modules -> lessons/labs -> assessment/feedback. Private Discord workspace versus web workspace remains an explicit architecture decision. Validate layout feasibility before promising the exact reference-image arrangement. Never expose application answers or individual navigation state in a shared public panel.

## Teaching standard
Design a comprehensive job-focused programme, with separately validated OSCP, CPTS, GPEN and advanced OSWE preparation mappings. Do not promise every tool, official endorsement, exam eligibility, an exam pass or employment.

For each module specify prerequisites, outcomes, underlying technology, setup, annotated demonstrations, tool options, expected output, troubleshooting, manual validation, guided practice, independent variants, evidence, reporting, remediation/retesting and marking guidance. Reduce hints as independence increases. Self-reported completion is not proof of professional competence.

## Curriculum domains to specify
Professional scope and ethics; networking and operating systems; Python/Bash/PowerShell and Git; reconnaissance and enumeration; vulnerability validation; network services and authentication; web and API testing; controlled exploitation; Linux and Windows privilege escalation; Active Directory and enterprise identity; internal assessment and segmentation; advanced web source review and debugging; scoped cloud identity foundations; reporting and retesting; independent capstones and career preparation.

These are planning domains, not finished modules. Produce a module-level syllabus, tool matrix, lab inventory, assessment rubrics and current certification-objective mappings before claiming coverage.

## Required home-lab onboarding
Include a Build Your Learning Lab section before practical testing. Provide tested host-platform guides, hardware readiness checks, lower-resource options, official download sources, integrity checks, version/licensing requirements and cost disclosure. Do not invent universal hardware minimums.

Teach installation, learner-workstation configuration, authorized target setup, network diagrams, isolation boundaries, snapshots or equivalent recovery, connectivity verification, troubleshooting, reset, backup and cleanup. Deliberately vulnerable targets must not be exposed to the public internet or unrelated home devices. Stage enterprise and advanced-web components progressively. Hosted infrastructure and spending require separate approval.

Each practical module must name required machines and tools, starting baseline, network topology, authorized targets, readiness checks, evidence requirements and reset procedure. Readiness requires a working, bounded and recoverable environment, not just an installed checkbox.

## Authorization boundaries
Course selection is not enrolment approval. Preserve owner-reviewed admission. Enrolment, restricted-lab authorization and formal awards remain separate controls. Do not make real learner decisions or change live permissions during design or demonstrations.

## Delivery sequence
1. Inventory formal-course code and existing enrolment controls.
2. Specify detailed syllabus, tools, labs, assessments and certification mappings.
3. Design interface wireframes and settle the private-workspace architecture.
4. Build one non-production vertical slice with synthetic data: course card -> overview -> application/status -> approved dashboard -> complete home-lab onboarding sample.
5. Review teaching depth, usability, authorization, accessibility and recovery.
6. Expand curriculum and independent assessments only after the sample is accepted.
7. Run regression, isolation and security tests; obtain separate pilot and release approval.

## Acceptance gates
No slash-command dependency or pop-up navigation in the learner journey. Private per-user state and evidence. Predictable Back/Next/Resume, repeat-click, stale-control and restart behavior. Reviewed lessons, labs and marking guides. No Community Learning changes or regressions. No production deployment or paid resource creation without explicit approval.

## Open decisions
Private Discord versus web architecture; lab budget and hosting; supported hardware/platforms; instructor review capacity; applicant-data and evidence retention; prerequisite assessment; certificate criteria; validated certification-objective versions.
