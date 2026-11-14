# Capstone: plan an authorized assessment from scope to report

## Outcome and prerequisites

Produce a complete, bounded plan for one eligible program without testing beyond written permission. Complete the earlier lessons. Use the self-review questions below and any owner-managed feedback to assess reasoning, evidence discipline and restraint, not a valid finding or payout. This lesson does not introduce automated grading, certification or a learner-acceptance release gate.

## Template

```bash
mkdir -p capstone && cd capstone
cat > plan.md <<'MD'
# Assessment plan
Program and brief reviewed: <name and date>
Assets allowed: <list>
Exclusions and prohibited methods: <list>
Automation, rate and account rules: <summary>
Accounts and data I control: <summary>
Techniques I will use: <list, each tied to a permitted rule>
Techniques I will not use: <list>
Request budget and stop conditions: <numbers and conditions>
Evidence I will keep and redact: <list>
Reporting route and disclosure rule: <summary>
MD
grep -c '<' plan.md
```

Expected: 10, the number of placeholder lines. Fill every line from the current brief. A placeholder remaining means the plan is incomplete.

## Procedure

1. Choose a program you are eligible for and read its current brief and platform rules.
2. Complete the plan and review it against the brief a second time.
3. Run only the approved low-intensity observations, recording each request and result.
4. For each lead, write the claim, evidence, alternative explanations and what you did not test.
5. Stop on unexpected data, instability or doubt, and use the program's route.
6. Draft a reproducible report only for a supported observation, then apply the triage and disclosure lesson.

## Self-review questions

Does every action map to a written permission? Did I use only accounts and data I control? Is the request count within the plan? Would the report make sense to someone who cannot see my tools? Did I avoid claiming impact I did not demonstrate?

## Exercise answer

Having no finding is a valid outcome. A well-bounded plan, accurate negative results and a clear stop decision demonstrate the intended skills.

## Cleanup

Delete scratch notes with sensitive data, close sessions and keep retained evidence in private storage allowed by the program.

## Validation limit

Only the template file command runs locally. No program was selected or tested.
