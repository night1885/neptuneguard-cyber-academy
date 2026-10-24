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
