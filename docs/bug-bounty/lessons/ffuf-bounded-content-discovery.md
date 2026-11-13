# Use ffuf only for a small approved path check

## Outcome and prerequisites

Understand how ffuf substitutes wordlist entries into a request and how to limit it. Complete the allowlist and rate-limit lessons. Content discovery sends many requests and is frequently restricted or prohibited. The default is not to run it. If the program does not explicitly allow it, complete this lesson as a planning exercise only.

ffuf's help lists 40 threads by default, a rate of 0 meaning no cap, no maximum runtime, and redirects off. Those defaults are unsuitable for a program unless it says otherwise.

## Prepare a tiny wordlist

```bash
printf '%s\n' 'help' 'docs' > words.txt
wc -l words.txt
```

Expected: 2. A wordlist is a request budget; do not download a large list for a practice target.

## Conditional command

```bash
ffuf -V
ffuf -w words.txt -u https://app.example.invalid/FUZZ -t 1 -rate 1 -p 1 -maxtime 30 -timeout 10 -noninteractive -o ffuf-results.json
```

-w supplies words; the FUZZ keyword marks the substitution; -t 1 uses one thread; -rate 1 caps requests per second; -p 1 adds a one-second delay; -maxtime 30 stops the whole process after 30 seconds; -noninteractive disables the pause console; -o saves output. Do not use -recursion, -r (follow redirects), POST fuzzing, Host-header fuzzing or parameter fuzzing here.

Match settings are separate from request volume. A hit means only that a response matched, so verify manually and within permission.

## Exercise and answer

Why can a 403 or 401 response still be useful? It may show that a route exists, not that access is possible. Do not try to bypass it.

## Troubleshooting and cleanup

If responses are all 403 or errors, stop; do not widen the list. Delete results with sensitive paths when finished.

## Source and validation limit

https://github.com/ffuf/ffuf

Only the wordlist commands run offline; ffuf was not installed or run.
