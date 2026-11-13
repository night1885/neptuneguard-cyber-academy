# Configure your tools and inspect one approved HTTP request

## Outcome

Explain your HTTP client's effective behavior, prepare private evidence storage and inspect one response from an expressly permitted endpoint. Use curl for a narrow request and Burp for manual observation. Do not treat either tool as an authorization system.

## Prerequisites and activity boundary

Complete the program-brief lesson first. Use a workstation you own or are authorized to configure. Shell examples require Bash, Python 3 and curl. Check installed versions before depending on flags. These commands are not a universal Windows PowerShell recipe. Provision missing software through the official project or your approved operating-system repository; do not use a random curl-pipe-shell installer.

The network step is conditional: your selected program must permit the exact URL, unauthenticated GET method, route, use of curl and direct connection. Do not use payment, logout, action-triggering, download or third-party endpoints. If a prescribed researcher header, authenticated account or approved proxy is required, do not run this baseline unchanged; use a separately reviewed configuration that meets the rules. There is no requirement to execute when no suitable endpoint exists.

## Inspect the installed tools

```bash
python3 --version
curl --version
curl --help all
```

The version output identifies the build and TLS/protocol capabilities. The online manual may describe a newer release. A version string is not proof of source authenticity or complete compatibility. No target request is sent by these checks.

## Prepare a fresh private session directory

```bash
umask 077
SESSION_DIR="$(mktemp -d "$HOME/bug-bounty-session.XXXXXX")"
cd -- "$SESSION_DIR"
printf 'Private workspace: %s\n' "$SESSION_DIR"
```

mktemp creates a fresh directory so old response files are not mistaken for new evidence. umask restricts ordinary new-file permissions in this shell; it does not encrypt the disk or secure pre-existing files. Do not add a Git remote or upload this directory.

## Prepare and inspect the destination before sending

Copy exactly one approved unauthenticated read-only HTTPS URL from your current plan, without credentials or tokens. No example live target is supplied.

```bash
read -r -p 'Exact approved HTTPS URL: ' APPROVED_URL
export APPROVED_URL
python3 - <<'PY'
import os
from urllib.parse import urlsplit

raw = os.environ['APPROVED_URL']
if any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in raw):
    raise SystemExit('Whitespace/control characters: stop')
u = urlsplit(raw)
try:
    port = u.port if u.port is not None else 443
except ValueError:
    raise SystemExit('Invalid port: stop')
if (u.scheme != 'https' or not u.hostname or u.username is not None
        or u.password is not None or u.fragment):
    raise SystemExit('Require HTTPS, hostname, no user information, no fragment')
print('Scheme:', u.scheme)
print('Hostname:', u.hostname)
print('Port:', port)
print('Path:', u.path or '/')
print('Query present:', bool(u.query))
print('No network request was made. Compare every component with the brief.')
PY
```

If parsing fails, stop. Do not continue to the request command. This parser is an inspection aid only: it neither validates program permission nor constrains DNS, network routing or the next shell command. Privately review any query for secrets and unexpected state-changing behavior.

## Conditional single-request baseline

Run once only after successful inspection and manual comparison with the current rules. This baseline intentionally bypasses environment-configured proxies; if that is not permitted in your environment or program, do not use it.

```bash
read -r -p 'Type SEND only after confirming this exact GET is permitted: ' CONFIRM
if [ "$CONFIRM" = SEND ]; then
  command curl --disable --globoff --proxy '' --noproxy '*' \
    --proto '=https' --connect-timeout 5 --max-time 10 \
    --silent --show-error \
    --dump-header response.headers --output response.body \
    --write-out 'http=%{http_code}\n' \
    --url "$APPROVED_URL"
  curl_status=$?
  printf 'curl exit=%s\n' "$curl_status"
else
  printf 'No request sent.\n'
fi
```

--disable is the first curl option and suppresses default configuration-file loading. --globoff prevents URL list/range expansion. --proxy '' and --noproxy '*' select direct operation rather than an inherited proxy. --proto limits the URL protocol to HTTPS. The two timeout options constrain connection establishment and overall transfer time. --silent with --show-error suppresses progress but retains errors. Headers and body go to separate local files, and the HTTP status prints separately. Capture the process status immediately.

No redirect-following, retry, authentication, scanner or alternate-target option is enabled. A logical HTTP request can still involve DNS, TLS and multiple underlying connection attempts; these flags do not guarantee an exact packet count or a tiny response. The time limit is not a response-size quota. Do not use this exercise for large/unbounded responses or sensitive-data retrieval.

## Read the result without inflating it

Expected outcome is not necessarily 200. A 3xx proposes another location; do not follow it automatically. A 401/403 signals an access condition, not permission to bypass it. A 429 or 5xx means stop and review, not add retries. curl can exit zero for an HTTP error without --fail. A connection/TLS failure is not an HTTP denial. Never use --insecure to force success.

Inspect response material privately before copying any excerpt. Headers can contain cookies; bodies can contain personal data. If unrelated sensitive data appears, stop further retrieval and follow the program's secure handling instructions. Record only the minimum permitted evidence. A normal response, server banner or missing header is not automatically a vulnerability.

## Burp manual workflow

Use the official Community installer appropriate to your workstation. In a dedicated temporary project, keep the proxy listener loopback-only. Open Proxy > Intercept > Open Browser; this embedded browser is preconfigured for Burp. Close personal-account tabs. Intercept off allows requests to flow but HTTP history can still record them.

Browser navigation can produce many subrequests and third-party contacts. It is not the single-request curl exercise and needs its own permission/budget review. Do not navigate a real page under an assumption that Burp scope filters block all other traffic. If the selected program does not allow the necessary browser activity, inspect a synthetic saved exchange offline instead.

For an allowed captured request, send it to Repeater, verify destination and session, then send unchanged at most once when the plan permits that additional request. Inspect status, response and identity. Make no parameter changes yet. A paused Intercept request is not a server outage.

## Independent exercise and explained answer

Explain separately: process status, HTTP status, application result and security conclusion. Example: curl exit zero plus 404 means the transfer completed and the server returned a missing-resource response; it does not prove a permission flaw. A 200 page under an anonymous session does not demonstrate authenticated access or another user's data.

Question: a 302 names another hostname. Should you add --location? Answer: not until the destination and action have separately passed scope review. The redirect does not grant permission.

Question: why not use Copy as curl from a personal browser? Answer: the exported command can include real cookies, bearer tokens and other sensitive context. Use only controlled, permitted material and review the entire artifact.

## Troubleshooting and final state

On command-not-found, resolve provisioning rather than changing targets. On certificate errors, investigate the actual trust/context problem without disabling verification. On proxy failure, check the intended routing; this baseline is explicitly direct. After failed transfers, label partial files as partial and do not submit them as complete evidence.

Close the testing browser and temporary proxy project when finished. Remove any proxy/trust changes you actually made. Keep only evidence permitted by the program, protect retained files and inspect the exact workspace before any deletion. No recursive deletion command is needed.

## Sources and validation limits

curl official manual: https://curl.se/docs/manpage.html

Burp official interception tutorial: https://portswigger.net/burp/documentation/desktop/getting-started/intercepting-http-traffic

Program brief requirements: https://docs.bugcrowd.com/researchers/participating-in-program/reviewing-bounty-briefs/

These procedures are authored instructions and expected interpretations. No real program request, installation, browser workflow or learner practical has been executed as part of this repository write. Full delivery tests, CI and deployment verification remain separate.
