# Collect candidate hostnames passively, then review them

## Outcome and prerequisites

Use passive discovery only to produce candidates for review, never as authorization. Complete the allowlist lesson. A wildcard in a brief does not mean every name found by a tool is in scope. Use only domains the program lists, and confirm that the program allows third-party data sources and automated tools.

Subfinder is a passive subdomain-discovery tool from ProjectDiscovery. Some sources need API keys, which are secrets; never place them in lesson notes, screenshots or repositories.

## Check the installed tool

```bash
subfinder -version
subfinder -h
subfinder -ls
```

Expected: version, help and the source list. Confirm that your installed flags match this lesson.

## Bounded command

```bash
subfinder -d example.invalid -silent -rl 1 -timeout 30 -max-time 2 -o candidates-raw.txt
```

Replace example.invalid only with an in-scope root domain. -d names one domain; -silent prints only hostnames; -rl 1 limits HTTP requests per second; -timeout bounds each wait; -max-time stops enumeration after two minutes; -o saves output. Subfinder's help lists a default of 10 minutes and sets no default rate in the flag list, so set both explicitly. Do not use -all, which the help marks as slow, or -nW, which resolves names actively, unless the program permits it.

## Review before use

```bash
sort -u candidates-raw.txt > candidates.txt
wc -l candidates.txt
```

Feed candidates.txt into the allowlist comparison from the earlier lesson, not into httpx, Katana or Nuclei. Passive results can be stale, wrong or belong to third parties.

## Exercise and answer

Why is a discovered name only a candidate? Passive records show that a name appeared somewhere; they do not show ownership, coverage or permission.

## Troubleshooting and cleanup

Empty output may mean the sources returned nothing, a key was missing or a timeout occurred. Do not add every source to compensate. Delete raw outputs that you no longer need and keep provider keys out of version control.

## Source and validation limit

https://docs.projectdiscovery.io/opensource/subfinder/usage

Flags come from the published usage page. Only shell syntax is checked; Subfinder was not installed or run during authoring.
