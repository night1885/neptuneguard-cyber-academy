# Bound a Katana crawl before starting it

## Outcome and prerequisites

Use Katana only on a program-approved, read-only section, with explicit scope and a small agreed crawl plan. Complete mapping and allowlist lessons. A crawler can trigger state-changing actions even through GET links. Logged-out use, slow speed and filtering are not guarantees of safety.

## Preparation

Install through the official project documentation and approved software process. Check local help before any target is supplied:

```bash
katana -version
katana -h
```

Agree on the start page, allowed paths, request ceiling, duration and stop conditions. Do not crawl authenticated workflows or an entire application merely because the hostname is in scope. If a tool cannot enforce the agreed budget, do not run it; use manual mapping.

## Conditional command pattern

The following is a pattern, not a runnable live assignment. Replace the invalid-domain URL and regex only after explicit program-based review. The regex restricts the example to one HTTPS hostname and a public documentation subtree.

```bash
katana -u https://app.example.invalid/docs/ -cs '^https://app\.example\.invalid/docs/' -d 2 -c 1 -rl 1 -o katana-urls.txt
```

-u chooses the starting URL; -cs defines the in-scope regex; -d 2 limits depth; -c 1 limits concurrent fetchers; -rl 1 limits requests per second; -o saves results. Depth and rate do not impose a total request ceiling. Confirm redirect handling and all background requests in your installed version before deciding whether this tool fits the approved plan.

Do not enable headless browsing, automatic form filling, credential headers or additional discovery options as shortcuts.

## Read the result before doing anything else

```bash
sort -u katana-urls.txt | head -n 20
```

Expected: up to twenty unique observed URLs for review. Discovery is not permission to request every URL. Return new destinations to the allowlist process rather than piping output to httpx or Nuclei.

## Exercise and answer

Why is a small depth not a request budget? A single page can contain thousands of links. Bound the actual work, not just the number of link hops.

## Troubleshooting and cleanup

Few links can reflect JavaScript rendering or access controls. Do not escalate depth or rate to compensate. Stop on unexpected state changes or sensitive output; keep only permitted redacted map data.

## Source and validation limit

https://docs.projectdiscovery.io/opensource/katana/usage

Only shell syntax is checked. No installation, crawl, redirect behavior or browser workflow was executed in authoring.
