# Read a program brief and bound a research session

## Outcome

Turn a current program brief into a narrow, explainable research plan. You should be able to identify what you may test, what remains uncertain and when you must stop. No target requests are needed for this lesson.

## Before you begin

Use the program's official platform page or company-published policy. Check your eligibility and access requirements. Do not borrow another researcher's invitation or assume a private brief may be shared with classmates. Use private notes permitted by the program; do not put confidential program details in academy chat, a public repository or an external AI prompt.

## Permission is a relationship, not a hostname

An asset can be listed while a particular activity remains forbidden. Record the researcher, exact asset, allowed action, permitted accounts/data, exclusions, intensity limits and disclosure conditions. All must fit at the same time. A wildcard does not automatically include third-party integrations or every port and protocol. A discovered IP, CNAME, redirect destination or JavaScript reference does not amend the brief.

Distinguish a monetary-reward program from a disclosure-only program. An advertised maximum is not a likely or guaranteed payment. A technically valid observation may already be known, excluded, ineligible or insufficiently supported. Do not submit invented findings to finish a lesson.

## Walk through the brief

1. Open the official brief and note the review date. Read the whole brief, not only the target table.
2. Identify the exact eligible target group and its reward conditions. Record relevant protocol, path, account and service restrictions.
3. Read out-of-scope entries and method exclusions. Examples to look for include automation, denial of service, social engineering, third-party services and payment workflows; actual rules control.
4. Check whether test accounts require a particular email, naming convention or researcher header. Do not invent a standard header or account rule.
5. Read known-issue information where available. Its absence does not prove novelty.
6. Read confidentiality, disclosure and applicable safe-harbor language. Do not describe protection as universal or extend it to excluded assets.
7. Read updates and the support route. Recheck at the start of each session. If a consequential point is unclear, ask through the program's designated route before testing.

## Worked fictional example

Suppose a fictional brief permits manual HTTPS research on portal.example.invalid, excludes payment routes and third-party services, and permits only your own test accounts. A suitable initial objective might be to understand the normal response from one expressly permitted read-only page. It is not permission to scan every subdomain, follow a login redirect into an identity provider or test another person's record.

The .invalid name is illustrative data, not a real practice target. Do not resolve or request it.

## Offline URL inspection

Run this only on your own computer. It parses strings and performs no DNS lookup or request. This exact-origin example does not implement wildcard, path, method, identity or network authorization.

```bash
python3 - <<'PY'
from urllib.parse import urlsplit

for value in [
    'https://portal.example.invalid/notes',
    'https://portal.example.invalid.other.invalid/notes',
    'https://portal.example.invalid@other.invalid/notes',
    'http://portal.example.invalid/notes',
]:
    u = urlsplit(value)
    try:
        port = u.port if u.port is not None else 443
        origin_matches = (
            u.scheme == 'https'
            and u.hostname == 'portal.example.invalid'
            and port == 443
            and u.username is None
            and u.password is None
        )
    except ValueError:
        origin_matches = False
    print(repr(value), origin_matches)
PY
```

Expected: only the first URL matches. The second changes the hostname, the third puts the approved-looking name in user information, and the fourth changes the scheme. Passing this predicate would not authorize a request.

## Independent program exercise

Privately review one real program without testing it. Record: official policy reference and date; eligibility/access; one exact permitted asset; one permitted read-only objective; relevant exclusions; account requirements; any stated traffic limits; confidentiality rules; and a stop condition. If the policy does not establish the necessary permission, record the unresolved question instead of inventing an answer.

A personal limit can be narrower than a program's ceiling, but cannot override a prohibition. Do not use a shared class schedule or direct an entire class to the same live target.

## Explain your answer

Question: an in-scope page redirects to an external authentication provider. May you probe that provider because the application uses it?

Answer: no automatic permission follows. Evaluate the new destination and activity against explicit coverage. Ordinary permitted use of a login flow does not grant vulnerability-testing authority over the identity provider. Stop or obtain clarification where needed.

Question: does a public reward range guarantee that a submitted report will be paid?

Answer: no. Scope, validity, novelty, eligibility, evidence and program decisions still apply. A no-finding session is an acceptable learning outcome.

## Troubleshooting and cleanup

If brief sections conflict, do not select the more permissive reading. Ask the designated support route. If a target was removed or a private invitation is unavailable, stop using it. Preserve only notes allowed by the policy and keep private-program information private. No network process was started by the parsing example.

## Sources and verification limits

Official brief guidance: https://docs.bugcrowd.com/researchers/participating-in-program/reviewing-bounty-briefs/

Program discovery and access: https://docs.bugcrowd.com/researchers/participating-in-program/finding-program/

Reward guidance: https://docs.bugcrowd.com/researchers/receiving-rewards/getting-rewarded/

This lesson contains predicted output and an offline teaching model. This repository write does not establish learner execution, live-program permission or platform-interface validation.
