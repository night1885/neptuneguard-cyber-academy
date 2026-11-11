# EH-LAB-04 — Observe HTTP on the authorized clean peer

Draft; commands and the complete two-VM workflow require execution before release. Requires EH-LAB-03 and available Python 3/curl. This is protocol observation, not scanning, exploitation or a production service.

## Scope
Only NG-Learner 192.0.2.10 and NG-Peer 192.0.2.20 on NG-FOUNDATION are authorized exercise systems. The permitted client actions are GET / and HEAD / on TCP port 8000 of NG-Peer. Do not enumerate other paths, test credentials, upload files or substitute an internet target.

## Start a minimal clean fixture
On NG-Peer, create a new empty exercise directory under your own home directory. Do not use a personal-files directory or a shared folder. From that empty directory create a single index.html containing:
```html
<!doctype html><title>NG clean peer</title><p>Authorized foundation exercise.</p>
```
Then, in the same guest directory, run:
```sh
python3 -m http.server 8000 --bind 192.0.2.20
```
Keep the terminal visible. This standard-library server is a local teaching fixture, not a hardened deployment. Binding to the lab IP limits the listening address; it does not replace topology and adapter checks. If the address is unavailable or port is occupied, stop and investigate. Do not bind to every interface as an unexplained workaround.

The server can expose other contents of its serving directory, which is why the empty directory and fixed file matter. Do not put secrets there. If the guest firewall blocks the exercise, record that observation and request a narrowly reviewed rule; do not disable the firewall wholesale.

## Observe the listener
On NG-Peer run `ss -ltn` and identify the listener's local address and port. Explain a listening socket versus an established connection. Record only relevant rows and do not claim the port is reachable merely because a listener exists.

## Make two bounded requests
On NG-Learner:
```sh
curl --noproxy '*' --connect-timeout 3 --max-time 5 -i http://192.0.2.20:8000/
curl --noproxy '*' --connect-timeout 3 --max-time 5 -I http://192.0.2.20:8000/
```
The proxy bypass keeps these specified lab requests from being sent through an environment-configured proxy. The time limits bound waiting; they do not establish isolation. `-i` includes response headers alongside the GET body; `-I` requests HEAD. Record the actual status line, selected headers, body behavior and peer-side log entries. Expected semantics are not a substitute for execution evidence.

## Interpret observations
A received HTTP error response means an HTTP responder answered; it is not the same as a transport timeout. A refusal, timeout and successful response support different, limited conclusions. No single result proves the whole network is safe. Headers can describe a server response without establishing a vulnerability. Do not turn version strings into unsupported severity claims.

## Stop and reset
Use Ctrl-C in the peer server terminal. Check the listener state again and repeat one permitted request to document the stopped-service observation. Shut down both guests when finished. Keep minimal assessment evidence; remove the disposable fixture or restore the documented baseline only when doing so will not erase evidence needed for review.

## Independent work
Explain how GET differs from HEAD using your own observations. Connect one client request to one peer log entry. Compare the running and stopped service states. State at least two conclusions your evidence does not justify. Submit redacted records, not screenshots containing unrelated windows, credentials or personal files.

## Teaching expansion: connect a request to a defensible observation

The commands above remain the complete client scope: GET / and HEAD / on the named peer and port. Do not add methods, paths, redirects, scanners, credentials or internet targets to investigate an unexpected result. All examples in this section are FICTIONAL reasoning aids, not transcripts to submit as practical evidence.

### Follow the exchange through four checkpoints

First, configuration identifies the intended peer and network. Second, a listener indicates a local socket is waiting on an address and port. Third, the client attempts its permitted connection and request. Fourth, a received HTTP response and a corresponding peer log can provide observations about that exchange. Each checkpoint supplies a different kind of evidence.

A listening socket does not prove remote reachability. A successful ping does not prove an HTTP listener exists. An HTTP response does not prove that the whole application is secure. Keep each claim attached to the observation that actually supports it.

In the existing URL, http identifies the scheme, 192.0.2.20 identifies the destination address, 8000 selects the TCP service port and / is the requested path. The client is not asking to search the subnet. The fixed root path also does not grant permission to retrieve other files that might be exposed by a mistaken server configuration.

### Understand the fixture before starting it

Python's simple server serves from its configured directory, which defaults to the current working directory. That is why the original procedure starts in a new empty exercise directory and creates only the fixed index file. Merely binding the server to the lab address does not restrict which files the server can access under its serving configuration.

Do not add symbolic links or mount shared/personal directories into the fixture. Python's simple request handler follows symbolic links, which can expose files beyond the apparent serving directory. If you discover unrelated or sensitive material, stop under the actual incident process; do not test whether you can retrieve it. This is a disposable teaching server, not a production deployment recommendation.

### Read the client options as safeguards with limits

The quoted '*' in --noproxy '*' is passed literally to curl, selecting proxy bypass for these calls rather than allowing shell wildcard expansion. It avoids routing the specified request through an environment-configured proxy; it does not prove the virtual network has no other paths.

--connect-timeout bounds connection establishment, while --max-time bounds the overall operation. They limit waiting, not permission. A timeout remains a result to interpret, not a reason to try another address. The -i option includes response headers with the GET output. The -I option requests HEAD rather than simply hiding a GET response body.

The curl manual also documents automatic loading of a default configuration file. That file can change behavior even when a command line looks bounded. The approved clean-guest route must establish that no unreviewed curl configuration adds destinations, redirects, uploads or other options. If that condition is unknown, stop and report the provisioning blocker before issuing requests. Do not assume proxy bypass disables all configuration loading. This supplement does not silently change the existing command blocks.

### GET, HEAD and representation metadata

GET requests a representation of the selected resource. HEAD has the corresponding retrieval semantics but the server must not send response content. A HEAD response can therefore describe a representation without transferring its body. A Content-Length field in HEAD is not proof that that number of body bytes arrived: when supplied, it describes the size that the corresponding GET content would have had under the applicable rules.

Do not require every header value to be byte-for-byte identical between separate requests. Time-related fields or resource state can change, and HTTP permits some omissions in HEAD responses. Compare the method, status, relevant metadata and body behavior; explain differences rather than editing the excerpts to match an expected transcript.

### Worked interpretation — FICTIONAL

A learner records a GET / response with status 200 and the fixture text. A subsequent HEAD / response has headers but no content. A minimal peer log excerpt shows the corresponding GET and HEAD paths and statuses. This supports that those bounded requests received responses consistent with the intended fixture during the observations.

It does not establish that no intermediary exists, that every network path is isolated, that the software has no vulnerabilities, or that the Server field is an independently verified software inventory. The Server field is response metadata, not a severity rating or permission to exploit an apparent version.

Correlate observations using method, path, address context, sequence and recorded times where available. A Date header is not a substitute for your own event record or proof that clocks agree. If timestamps were not captured, say so. Do not invent them retrospectively.

### Interpret an unexpected result without escalating the test

| Result | Limited interpretation | Next permitted step |
|---|---|---|
| HTTP 404 | An HTTP responder answered, but did not provide the requested resource as expected | Check the peer's serving directory and fixture locally; do not enumerate paths |
| Connection refused | The connection was actively rejected; a missing listener is one possible cause | Compare the peer listener and actual process state |
| Timeout | The operation did not complete within its configured bound | Review attachment, addressing, filtering and listener evidence; avoid claiming one proven cause |
| Body differs from the fixed fixture | The serving context or responder may differ from the intended one | Stop and verify identity and local directory before any further request |
| A redirect is returned | A responder instructed the client toward another location | Record it; do not follow it or widen the destination scope |

### Running versus stopped state

Stopping the visible server and checking the listener changes the question from “did the fixture answer?” to “what was observed after this controlled intervention?” Repeat only the one request allowed by the original stop procedure. Report the actual result. If HTTP still answers, do not force a preferred conclusion: the original server might not have stopped, another process might own the listener, or the response path might differ. Stop and reconcile the evidence locally.

### Review questions with explanations

1. HEAD shows Content-Length but no body. Is that automatically a failure? No. HEAD intentionally omits response content; the field can describe the corresponding GET representation.
2. A 404 arrives. Is the peer necessarily unreachable? No. Receiving an HTTP status demonstrates a response, although the intended fixture was not obtained as expected.
3. Does --noproxy establish isolation? No. It controls curl's proxy use for that invocation, not hypervisor topology or all system paths.
4. A response advertises a version. Can you report a confirmed critical vulnerability? No. A version string alone does not establish applicability, exploitability or impact, and further testing is outside this exercise.

Technical basis: Python http.server documentation; curl command-line manual; RFC 9110, especially GET, HEAD and Content-Length semantics. Record the actual installed tool versions rather than assuming they match the documentation examples.
