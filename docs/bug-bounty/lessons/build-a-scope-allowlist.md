# Build a scope allowlist before automation

## Outcome and prerequisites

Convert a current program brief into a deliberately reviewed input list. Complete read-program-brief.md first. API inventory is a later application of this scope review, not a prerequisite for it. Bugcrowd and other platforms are the practice environment, but listing an asset does not authorize every method. Review exclusions, automation permission, identity requirements, rate and disclosure rules separately.

## Optional local preparation

Use Bash and standard grep. Work in a new private directory; the example overwrites these three synthetic lists.

```bash
printf '%s\n' 'app.example.invalid' 'api.example.invalid' > allow.txt
printf '%s\n' 'app.example.invalid' 'beta.example.invalid' 'api.example.invalid' > candidates.txt
grep -Fxf allow.txt candidates.txt > scope-matches.txt
grep -Fxvf allow.txt candidates.txt > held-for-review.txt
wc -l scope-matches.txt held-for-review.txt
cat held-for-review.txt
```

Expected: two matching names and one held name, beta.example.invalid. -F means literal strings, -x means whole lines, -f reads patterns from a file and -v inverts the match. No network request occurs. Matching is not testing authorization.

## Program-based exercise

1. Privately record the current brief URL, review time and exact permitted assets. Do not copy private brief material to public tools.
2. Separate exclusions and method constraints. A wildcard requires manual interpretation; this script does not expand it.
3. List candidates from permitted documentation and normal application use. Normalize names deliberately rather than guessing aliases.
4. Compare exact names. Review every match for allowed scheme, port, path, account, method and intensity before creating a tool input file.
5. Put new hosts, redirect destinations and third parties back through review. Never pipe discoveries directly to another scanner.

Completion means a short reviewed list and an explicit request budget, not a large number of hosts. If automation is prohibited, use the list for permitted manual work only.

## Questions and answers

Why not use substring matching? app.example.invalid.other.invalid contains the approved-looking text but is a different host.

Is a scope match sufficient? No. The method, account, time and intensity must also be allowed.

## Troubleshooting and cleanup

Inspect unexpected mismatches with cat -A for spaces and line endings. grep returns 1 when no lines match; this is not necessarily an execution error. Retain real scope notes privately and remove synthetic scratch files when finished.

## Reference and evidence limit

https://www.bugcrowd.com/resources/hacker-resources/standard-disclosure-terms/

Only the synthetic file comparison is executed in authoring. No real scope determination or request is claimed.
