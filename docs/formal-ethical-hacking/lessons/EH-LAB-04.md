# EH-LAB-04 — Observe HTTP on the authorized clean peer

Draft; commands and the complete two-VM workflow require execution before release. Requires EH-LAB-03 and available Python 3/curl. This is protocol observation, not scanning, exploitation or a production service. The lesson does not supply actual lab authorization or a validated host/guest route. Community Learning is unchanged.

## Your task and finish line
Build the existing one-file clean fixture on NG-Peer, identify its local listener, make the two permitted requests from NG-Learner, relate a request to a peer log entry, and compare the running and stopped service. Finish with the existing independent explanations and a documented safe final state. Professional report construction remains in EH-LAB-05.

Do not execute an unfinished draft merely because commands are present. Establish actual authorization, supported setup, tool availability and the approved support procedure first. A blocked practical needs an honest blocker record, not invented output or a different target.

## 1. Scope and pre-flight check
| Item | Existing exercise boundary |
|---|---|
| Client | NG-Learner, 192.0.2.10 |
| Peer | NG-Peer, 192.0.2.20 |
| Network | The reviewed NG-FOUNDATION internal network from EH-LAB-03 |
| Transport and service | HTTP over TCP port 8000 on NG-Peer |
| Permitted client actions | GET / and HEAD /; one of these may be repeated for the stopped-service observation |
| Excluded | Other paths/ports/targets, credential testing, uploads, scanning and exploitation |

These documentation addresses are course-local choices, not discovery targets or proof of authorization. Recheck the existing adapter/address/route configuration before practical work, especially after reboot or restoration: temporary addresses may not survive. Do not add NAT, bridging, forwarding or an external adapter to fix a failure.

Verify that the selected guest Python, curl and local inspection tools are available through the reviewed provisioning route. A missing tool or unresolved firewall requirement is a blocker, not permission to reconnect the guest, install arbitrary software or disable the firewall.

Keep three work areas distinct: a visible server terminal on NG-Peer, a second local-inspection terminal on NG-Peer, and the client terminal on NG-Learner. None of these commands belongs on the physical host.

## 2. Understand what each tool demonstrates
| Tool/action | Job here | Limit |
|---|---|---|
| Local directory and text-file tools | Create the single disposable fixture under the peer account's home directory | Must not reuse a personal-files directory, shared folder or existing unrelated content |
| python3 -m http.server | Run Python's HTTP teaching server from the fixture directory | Not a hardened production deployment or application-security assessment |
| ss -ltn | Show local listening TCP sockets with numeric addresses/ports | Local listener state does not prove remote reachability or identify ownership by itself |
| curl | Make each specified GET/HEAD request and display its result | Client status, HTTP status and application security are separate questions |
| Visible peer logs | Correlate a permitted client action with the fixture's recorded request | Not a packet capture or proof of everything that crossed the network |
| Ctrl-C in the server terminal | Stop the foreground fixture for the existing stopped-service comparison | Must be followed by observations rather than an assumed successful stop |

Documentary sources consulted 2026-11-02:
- Python HTTP-server behavior and limitations: https://docs.python.org/3/library/http.server.html
- curl option and exit-code reference: https://curl.se/docs/manpage.html
- Local socket inspection: https://man7.org/linux/man-pages/man8/ss.8.html

These references can describe versions newer than the guest tools. Record actual versions and confirm the selected options against the installed tools; no course-tested version is established by this draft.

## 3. Create a genuinely clean fixture on NG-Peer
Work as the ordinary guest account, not as root. The directory and file creation are the existing disposable fixture task. Execute one step at a time; stop on an error instead of pasting the whole sequence through a failed prerequisite.

1. In NG-Peer's server terminal, create this new directory under that guest account's home:

```sh
mkdir "$HOME/ng-http-peer"
```

If it already exists, stop and resolve that collision through the approved exercise process. Do not delete existing data or use an existing directory because its name matches. A successful mkdir establishes a new directory for this attempt; it does not prove the later terminal is still inside it.

2. Only after successful creation, enter and inspect the directory:

```sh
cd "$HOME/ng-http-peer"
pwd
ls -la
```

Run these one at a time. cd changes the current terminal's directory; pwd shows where it is; ls -la includes hidden entries. Apart from the directory bookkeeping entries, it should be empty. Stop on unexpected files, links or a failed cd. Do not submit a full personal home path as evidence; a minimal redacted location description is enough.

3. Using an available local text editor, create only index.html in that directory with this exact fixture content:

```html
<!doctype html><title>NG clean peer</title><p>Authorized foundation exercise.</p>
```

Confirm it was saved as index.html rather than an unintended extra-extension filename. Do not add personal files, credentials, symbolic links, scripts or other site content. Python's simple server can expose directory contents and follow symbolic links; a harmless intended page does not make unrelated content safe to serve.

4. Confirm the server terminal is still in that reviewed directory, then run the existing fixture command there:

```sh
python3 -m http.server 8000 --bind 192.0.2.20
```

python3 selects the guest interpreter; -m runs its http.server module; 8000 selects the port; --bind selects the peer's reviewed lab address. Without an explicit bind address the server can listen on all interfaces, so do not remove the binding as a workaround. Keep the foreground terminal visible. This plain HTTP fixture supplies neither TLS nor production authentication/hardening.

If the address is unavailable, the port is occupied or startup fails, stop and record the actual error. Do not move to a different port, kill an unidentified process, run the server as root or bind to every interface to force success. If a firewall blocks the approved exercise, request a narrowly reviewed rule rather than disabling it wholesale.

## 4. Observe the listener locally on NG-Peer
In the second peer terminal, run:

```sh
ss -ltn
```

-l selects listening sockets, -t selects TCP, and -n keeps numeric addresses/ports instead of service-name resolution. Identify the relevant local endpoint 192.0.2.20:8000 and preserve only the relevant rows and context. A wildcard endpoint or unexpected address is not equivalent to the intended binding; stop and reconcile it with the server and adapter configuration.

A listening socket is waiting for connection attempts. It is not the same as an established connection, a completed HTTP request or proof that the other guest can reach it. This selected ss invocation does not establish the owning process by itself. Relate the observation to the visible fixture startup and the later controlled stop rather than assigning every matching port to Python without evidence.

## 5. Make the two bounded requests from NG-Learner
Use the approved guest curl executable, not an unreviewed wrapper. Run each request separately, followed immediately by the local exit-status print. The print reads the immediately preceding command's status; another intervening command would replace that status. Do not pipe the requests through another program and mistake that program's status for curl's.

GET /:
```sh
curl -q --noproxy '*' --connect-timeout 3 --max-time 5 -i http://192.0.2.20:8000/
printf 'curl exit: %s\n' "$?"
```

HEAD /:
```sh
curl -q --noproxy '*' --connect-timeout 3 --max-time 5 -I http://192.0.2.20:8000/
printf 'curl exit: %s\n' "$?"
```

| Part | Meaning and boundary |
|---|---|
| -q, as curl's first option | Suppress automatic loading of the default curl configuration file so it cannot silently supply extra options or URLs; this does not neutralize an untrusted executable/wrapper |
| --noproxy '*' | Bypass proxies for the specified request; quotes keep the shell from expanding the asterisk into filenames |
| --connect-timeout 3 | Bound curl's connection phase to three seconds |
| --max-time 5 | Bound this transfer's total allowed time to five seconds; not an isolation guarantee |
| -i | Include response headers with the normal GET response output |
| -I | Make the HTTP HEAD request rather than merely hiding a GET body |
| Explicit URL | Keep the scheme, address, port and root path within the existing brief |
| printf and $? | Print the preceding local curl process status; not the HTTP status code |

The first-option -q is a scope-preserving clarification to the earlier command form; the two permitted methods, root path, target, port and time limits are unchanged. Do not add redirect-following, retry loops, authentication, uploads, extra URLs or path enumeration. If a redirect or unexpected endpoint appears, record it and stop rather than following it. Do not open the page in a browser that might make additional requests outside these two specified actions.

For each request, record the actual status line, selected headers, body behavior, client diagnostic/exit result and relevant peer log entry. Distinguish response output from a progress display or diagnostic. Expected semantics are not execution evidence. Do not insist that the protocol version, Date value, header order, version string or byte count must match an invented transcript.

## 6. Connect the client observation to the peer
In the visible server terminal on NG-Peer, identify the log entry corresponding to the request you just made. Use the observed method, path, client identity and sequence/time context to justify the association. Keep only the minimal useful excerpt; do not invent a timestamp or assume guest clocks are synchronized.

Explain how the GET result and HEAD result differ in your own observations. HEAD is a distinct request method whose response has no content body; a displayed Content-Length can describe the corresponding GET representation rather than bytes received as a HEAD body. A header does not authorize additional tests. If behavior differs from the intended fixture, preserve the discrepancy and resolve it without expanding requests.

A peer log entry is useful correlation, not a complete wire trace. Unexpected clients, methods, paths or sensitive content are stop conditions; do not investigate them by probing additional systems or copying unrelated data.

## 7. Interpret results without overclaiming
| Observation | Supported limited interpretation | Not established |
|---|---|---|
| A status line and headers were received | An HTTP responder answered this particular request at the observed endpoint/time | Whole-network isolation, secure code or permission to continue testing |
| An HTTP error status was received | An HTTP response occurred; investigate the intended fixture/configuration within scope | That the transport simply timed out or a vulnerability exists |
| Connection refusal or timeout | The attempted transfer failed in the reported way | A unique cause, universal service absence or isolation |
| A Server/version header | The responder advertised that value | Verified patch level, exploitable weakness or severity |
| curl process status zero | curl reported success under the selected options | That the HTTP status was 200 or the application is secure |

These commands do not use --fail, so an HTTP error response need not produce a nonzero curl process status. Conversely, receiving some headers does not prove an entire transfer completed successfully. Record HTTP status and client exit separately. An absent body alone is not a vulnerability, especially for HEAD. This is an authorized protocol observation, not a vulnerability-finding requirement.

## 8. Stop the service and make the existing comparison
1. In NG-Peer's visible server terminal, use Ctrl-C to stop this foreground fixture. Do not terminate arbitrary processes or close an unidentified terminal as a substitute.
2. In the peer inspection terminal, run ss -ltn again and record the relevant listener observation. If the endpoint remains, stop and resolve the discrepancy rather than kill something until the row disappears.
3. From NG-Learner, repeat only the same permitted GET / command and immediate exit print:

```sh
curl -q --noproxy '*' --connect-timeout 3 --max-time 5 -i http://192.0.2.20:8000/
printf 'curl exit: %s\n' "$?"
```

4. Compare the running-service listener/request observations with the actual stopped-service observations. Do not promise a universal refusal or timeout result. If a response still arrives, do not declare the service stopped: record the unexpected state and obtain reviewed troubleshooting without changing target or port.
5. Preserve minimal approved assessment evidence, then shut down both guests cleanly when finished. Record the actual final state. Remove only the disposable fixture or restore the documented baseline under the approved reset procedure, and only when doing so will not erase required evidence or unrelated work. Restoration can also reset networking; recheck before later use. No additional rollback drill is added here.

## 9. Existing independent work and review
Explain how GET differs from HEAD using your own observations. Connect one client request to one peer log entry. Compare the running and stopped service states. State at least two conclusions your evidence does not justify. These remain the existing tasks; no additional assessment, numeric threshold or automatic progression rule is introduced.

A reviewer should look for the exact permitted endpoint/methods, genuine client and peer observations, an evidence-based running/stopped comparison, clear separation of HTTP/client status, and explicit limitations. Feedback should identify the missing observation or unsupported inference and request a targeted correction. A blocked learner must not be asked to bypass isolation or fabricate a successful transcript.

Use the approved private submission route only when collection/access/retention policies exist. This draft is not a collection system. Submit redacted records, not unrelated windows, passwords, personal paths or full diagnostic bundles. Fictional predictions must stay labelled as such and cannot replace executed practical evidence.

## Authoring and release boundary
This expansion retains EH-LAB-03 and the existing tool prerequisites, the two named guests on NG-FOUNDATION, TCP port 8000, GET / and HEAD /, the original HTML fixture, and the existing stopped-service check and independent tasks. EH-LAB-05 remains the reporting lesson. The added first-option curl -q suppresses default configuration loading; local directory/status instructions explain the already required fixture/evidence work rather than add remote actions.

No new canonical lesson, prerequisite edge, target, path, port, publication flag, runtime integration, Discord handler, database change or deployment is introduced. No fixture creation, server startup, socket inspection, HTTP request, command execution in a guest, full repository suite, two-VM reproduction or assessor calibration was performed for this authoring batch. Source-supported teaching is not hardware validation, practical permission, a grade, an award or learner-release approval.
