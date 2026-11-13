# Probe an approved URL with ProjectDiscovery httpx

## Outcome and prerequisites

Use ProjectDiscovery httpx to inspect a small approved URL list without accepting its throughput defaults. Complete the allowlist lesson. Confirm automated probing is permitted; use manual observation instead if it is not. This is ProjectDiscovery's executable, not the Python HTTPX package.

## Tool preparation

Install from the official project documentation using your approved software process. Record version and help locally:

```bash
httpx -version
httpx -h
```

Check that the executable and flags match this lesson. Program rules take priority over examples. Treat updates and other tool background traffic as a separate privacy consideration.

## Conditional program command

Create approved-urls.txt manually with a tiny reviewed list of full URLs, including scheme. Check that any protocol fallback is covered by the written authorization. If you cannot bound that behavior in your installed version, use the previously taught single curl request instead.

```bash
httpx -l approved-urls.txt -no-stdin -rl 1 -t 1 -timeout 10 -retries 0 -sc -cl -o httpx-results.txt
```

-l reads only that file; -no-stdin prevents accidental piped input; -rl 1 caps requests per second; -t 1 sets one worker; -timeout 10 bounds waiting per attempt; -retries 0 disables retries; -sc and -cl display status and length; -o writes the result file. A per-second ceiling is not a total request budget. Check planned protocol attempts and list size before running.

Redirect-following is not enabled here. Do not add -fr: another destination needs its own scope review. Do not add technology detection, screenshots, extra paths or ports as incidental options.

## Exercise and interpretation

Run only if the program permits this exact small plan. Compare results with one normal application observation and record differences without repeating probes.

Expected: result lines for responding targets, with status and length. No output or a timeout is inconclusive; it does not establish that an asset is absent. A 200 response does not establish a vulnerability. Save the output instead of rerunning for convenience.

## Questions and answers

Why set rate and threads? Tool defaults are throughput choices, not program permission. Use a stricter program limit when applicable; a 1-per-second example is not universally safe.

## Troubleshooting and cleanup

Stop on 429, unusual errors, instability or program contact. Do not retry from another account or address. Remove sensitive output under the program's retention rules.

## Source and validation limit

https://docs.projectdiscovery.io/opensource/httpx/usage

Shell syntax is checked only. httpx, its installation and live probing were not executed during authoring.
