# Nmap observations — fictional offline interpretation pack

Draft supporting work for [EH-ASSESS-02](EH-ASSESS-02.md), not another canonical lesson or additional scan authorization. Use only the supplied [observations.xml](../fixtures/nmap-observations/observations.xml). Every case is fictional. No Nmap invocation, packet capture, HTTP request, service change or live target is needed to complete this task.

## 1. Know what kind of record you have
The file uses an explicit teaching-observations wrapper containing three independent fictional cases. It borrows selected address/port/state/service fields from Nmap's XML vocabulary; it is not untouched native Nmap output, a complete nmaprun document or a DTD-conformance sample. Do not import it into a tool as if a real scan produced it.

All three cases name 192.0.2.20, TCP port 8000, because that matches the earlier lesson's narrow example. Those values remain inert dataset labels here. They do not establish real ownership, reachability, isolation or permission to scan. Case letters and file order are not timestamps or a demonstrated before/after sequence.

## 2. Read the state in context
Nmap describes six possible port states; these examples exercise only open, closed and filtered. The state is how the scanner sees the endpoint from its scan context, not a permanent intrinsic property or whole-host security verdict.

- Open: the reported observation supports an application accepting the relevant traffic under that scan's conditions. It does not identify every application feature or establish a vulnerability.
- Closed: the observed response supports no listening application at that endpoint under those conditions. It does not establish that the host is offline or that the port can never open.
- Filtered: the scanner cannot decide open versus closed because relevant probing/response information is obstructed. The label does not uniquely locate a firewall, explain its exact rule or prove the application is stopped.

The supplied records contain no packet trace or reason attribute. Do not invent a particular TCP flag, ICMP code, packet count or timing explanation from the state label alone. Real interpretation also needs the method, exact command, vantage point, tool/OS version, relevant configuration and observation time.

## 3. Distinguish a service label from identification
Case A contains a service element with name http-alt, method table and conf 3. In Nmap XML, method table means the service name was looked up from its services database using port/protocol; method probed refers to the version-detection system. The confidence field is Nmap's service-name confidence on its documented scale, not a percentage probability that a vulnerability exists.

This fictional table label is not an HTTP response, a product/version fingerprint or a demonstrated exploit. No product/version is supplied. A missing service element in B/C means the dataset supplies no such service label there; it does not independently prove what is or is not installed.

EH-ASSESS-02's permitted command requests no -sV detection. Do not add -sV, -A, scripts, more ports or another target to settle an uncertainty. Any changed test requires its own approved scope and budget. Reading this pack does not expand the earlier two-invocation exercise design.

## 4. Inspect the tiny fixture offline
First read the XML as text in your approved editor. Identify each case ID, address, protocol, port, state and whether a service/method is supplied. Then, if Python is available through the approved setup route, save this reader as read_observations.py beside observations.xml:

```python
from pathlib import Path
import xml.etree.ElementTree as ET

raw = Path("observations.xml").read_bytes()
if len(raw) > 16384:
    raise ValueError("Use only the tiny reviewed teaching fixture")
root = ET.fromstring(raw)
if root.tag != "teaching-observations" or root.get("synthetic") != "true":
    raise ValueError("Expected the fictional case pack, not an arbitrary scan report")
for case in root.findall("case"):
    host = case.find("host")
    address = host.find("address").get("addr")
    port = host.find("ports/port")
    state = port.find("state").get("state")
    service = port.find("service")
    label = service.get("name") if service is not None else "not-supplied"
    method = service.get("method") if service is not None else "not-supplied"
    print(case.get("id"), address, port.get("protocol"), port.get("portid"), state, label, method)
```

Run `python3 -B read_observations.py` in that disposable directory. It reads the named local fixture only and prints selected fields; it runs no scanner and makes no network request. Use the reviewed tiny file, not arbitrary external XML, large reports, DTDs or entities. The size/tag checks are exercise guards, not a hardened general XML-ingestion design. No parser security or native-Nmap-format guarantee follows.

If the approved tools or material-transfer route is missing, complete text inspection and record the blocker. Do not install packages or reconnect an isolated guest to do this task.

## 5. Worked reasoning — FICTIONAL case A
Observation: the provided case labels TCP/8000 open and supplies a table-derived service name. Bounded interpretation: the fictional scan classifies that endpoint as accepting connections, but the service label alone does not verify HTTP or a product/version. Missing information includes an actual scan command/version/time and contemporaneous authorized application evidence. This is paper reasoning about a dataset, not an executed practical transcript.

For B and C, independently write one supported conclusion, two unsupported conclusions and one next clarification that stays inside actual authorization. Do not equate no response, an HTTP error, closed and filtered. Do not infer that A changed into B because the cases appear in that order.

## 6. Correlate before making a finding
A real known-fixture listener observation, a bounded client response and a scan classification would answer different questions. To correlate them, identify the same authorized endpoint, environment, method and relevant time; preserve genuine minimal evidence and explain discrepancies. Without those links, do not claim you diagnosed or remediated a service.

Complete the [worksheet](NMAP-OUTPUT-WORKSHEET.md). Keep a service observation distinct from a confirmed vulnerability and from a severity/priority decision. Do not map a table label directly to a CVE, report a version absent from the record or describe all services/ports as assessed.

## Author checks and limits
The 1034-byte UTF-8 fixture had SHA-256 b20accd3ddbbb0189601e3059288e9c05c60ee4f9013daae3822e11d4f394b26 during authoring. Local parsing verified three unique cases A/B/C, one address and TCP/8000 per case, states open/closed/filtered, and only A's stated table-derived service element. The supplied reader executed on Python 3.12.8 with exit status zero and printed three rows. These are parsing/field checks, not three scan executions or a calibrated test suite.

No Nmap, native-output/DTD validation, student two-VM execution, HTTP request, grading calibration, supported-guest route, full repository check or GitHub CI run occurred for this batch. Synthetic learner answers belong only in the approved private workflow when available; do not commit personal evidence or protected marking guidance. The catalogue stays at 37 entries; runtime/publication and Community Learning are unchanged.

Sources:
https://nmap.org/book/man-port-scanning-basics.html
https://nmap.org/book/output-formats-xml-output.html
