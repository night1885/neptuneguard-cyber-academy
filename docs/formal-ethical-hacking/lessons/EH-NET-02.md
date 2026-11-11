# EH-NET-02 — Ports, TCP and application responses

Draft; not published or hardware-tested. Requires EH-NET-01 and EH-LAB-04. Use only the previously authorized clean peer on TCP 8000.

## Outcomes
Distinguish an IP path, transport connection, listening socket and application response. Explain why one observation does not establish every layer of the path.

## Connect the layers
An IP address and port together help identify a transport endpoint. TCP and UDP have separate port namespaces; a number alone is not a service identity. A conventional port association is a clue, not proof of the application or its security. This course fixture explicitly selects TCP 8000.

TCP provides a reliable ordered byte stream while a connection is functioning. It does not encrypt application data or guarantee that the receiving application successfully processed it. In the ordinary active/passive connection establishment, SYN, SYN-ACK and ACK synchronize connection state. Applications exchange data after transport establishment. A successful transport connection is not the same as a successful HTTP operation.

A listener is local state: a program is waiting for connections on a local endpoint. It does not establish that another machine can reach it. A client also has a local endpoint; its source port need not equal the server's destination port.

## Observe without expanding scope
Recreate only the clean fixture already defined in EH-LAB-04. On NG-Peer inspect `ss -ltn`. From NG-Learner repeat only the permitted GET / or HEAD / against 192.0.2.20:8000 using the bounded curl commands in that lesson. Record actual observations and keep the request count small. No scanning, additional paths, credential checks or packet capture is introduced here.

Map the evidence into four questions:
- Which peer address and transport port were requested?
- What local listener evidence exists on the peer?
- Was an HTTP response actually received?
- What remains unknown about the path or the service?

Short-lived connections may be gone before a separate socket listing runs. Absence from a later listing does not prove no connection occurred. Do not invent a captured handshake from a curl result; packet-level evidence has not been collected in this exercise.

## Interpret outcomes carefully
A refused connection is not equivalent to a timeout. A timeout means the attempt did not complete within the chosen limit; it does not uniquely identify filtering, routing or service state. An HTTP error status means a responder returned an application-level response, not necessarily that the network is broken. An expected HTTP response supports only the bounded observation at that time.

Do not label a header or an open listening port as a vulnerability without a justified security claim, affected condition and impact. This exercise does not seek a vulnerability.

## Independent explanation
Draw the client/server endpoint pair for one actual request. Explain where TCP fits beneath HTTP. Compare the running-service and stopped-service observations from EH-LAB-04. Offer at least two plausible explanations for a timeout and identify a narrow authorized observation that could help distinguish them. Do not execute those observations if they exceed current scope.

## Evidence
Submit a concise request/result excerpt, relevant peer listener/log evidence, final service state and limitations. Genuine unsuccessful execution can be assessed for sound troubleshooting; fabricated success cannot. Formal rubric calibration remains pending.

Source: RFC 9293, https://www.rfc-editor.org/info/rfc9293/ . No handshake, VM networking or application behavior was executed merely by authoring this lesson.

## Expanded teaching: distinguish transport evidence from application evidence

Keep the original clean-peer scope and request limits. These additions introduce no scanners, packet capture, extra methods, paths, ports or destinations. Hypothetical endpoint pairs and protocol sequences are FICTIONAL reading aids, not captured lab traffic.

### Describe both ends of the conversation

A TCP exchange involves a local and remote address/port pair in its relevant network context. The peer's port 8000 is the exercise's destination service port. The client has its own source port, which need not equal 8000 and can differ across connections. Do not invent a client port if the collected evidence does not record it.

For a fictional drawing, write “NG-Learner address : client port not observed -> NG-Peer address : TCP 8000.” This is more honest than assigning an arbitrary ephemeral port and presenting it as measured. If an actual record supplies a value, label its source and time.

A port number does not independently authenticate a program. TCP and UDP use separate namespaces, and an application can use a non-conventional port. The fixture is identified by the reviewed configuration and correlated observations, not by a number's reputation.

### Explain the service TCP provides

TCP presents applications with an ordered byte stream. Its protocol uses sequence numbers, acknowledgments and retransmission to support delivery despite certain losses and errors. It does not promise that a connection can survive every failure indefinitely.

A byte stream is not a record of the application's message boundaries. An application must interpret its own framing, such as HTTP's rules. A receiving program may read data in pieces that do not correspond one-for-one with the sender's writes. Do not infer a precise packet layout, segment count or application read pattern from the displayed response text.

Reliable transport is also not encryption, application authorization or proof that the requested business operation succeeded. Those are different properties requiring their own mechanisms and evidence. In this lab, even a valid HTTP response supports only the bounded request observation.

### Read a handshake as a model, not a transcript

The ordinary SYN, SYN-ACK and ACK explanation describes TCP connection establishment. A textbook sequence can help explain how both sides synchronize state, but it is not evidence that those exact packets were captured during a learner's curl invocation.

If only curl output and a peer log were collected, report those records. You may explain the protocol model separately, labelled as explanatory background. Do not paste a synthetic packet table into the evidence index or report sequence numbers and retransmissions that were never observed. Packet capture remains outside this lesson's authorization.

### A listener and a connection are different states

The peer listener check asks whether local TCP listening state is shown at the intended address and port at the time of inspection. It is not an inventory of every historical request. The client/server connection can be short-lived, so a later socket listing may not include it even when a response was genuinely received earlier.

Time alignment matters. “No matching listener in the recorded post-stop listing” and “the earlier request received a response” can both be true. They describe different times. A report should not combine them into a contradiction without checking the sequence and context.

Similarly, the absence of a row is meaningful only in relation to what command ran, its success, filters, context and capture completeness. Do not convert a partial screenshot into a universal statement that no process or service exists anywhere.

### Worked evidence comparison — FICTIONAL

Case A: the peer listener is shown, but a permitted client request times out. The local listener observation and the incomplete client operation do not identify one proven cause. Attachment, addressing, path controls or service behavior may need reconciliation using only already-authorized observations.

Case B: the client receives an HTTP 404 response. An HTTP responder answered. The intended fixture was not obtained as expected, but “TCP was impossible” is inconsistent with the received application response in the stated context. Check the existing peer-local fixture procedure; do not enumerate other paths.

Case C: the client receives the fixed fixture text, but no handshake capture exists. Report the response and correlated peer log, if available. Do not claim packet-level verification or encryption. This exercise uses the HTTP fixture already specified, not a newly introduced TLS service.

### Troubleshooting without turning it into discovery

| Observation | Narrow interpretation | Scope-preserving response |
|---|---|---|
| Refused connection | An active rejection was reported | Compare intended destination and peer-local listener state; do not claim a unique rejecting device |
| Timeout | The bounded operation did not complete | Keep alternative explanations open and review existing configuration evidence |
| HTTP error response | A responder returned an application result | Interpret its actual status and fixture context rather than calling every error a network outage |
| Later listing lacks the short-lived connection | No matching state was shown then | Align timestamps and distinguish current state from earlier behavior |
| Response advertises software | The response contains that metadata | Do not treat the string as authenticated inventory or a confirmed vulnerability |

### Exercises and explained answers

1. Must the client's source port be 8000? No. The named server destination port does not prescribe the client's local port.
2. Does TCP success prove HTTP success? No. Transport establishment and the application response are separate observations.
3. Does a TCP acknowledgment prove that a user-facing action completed? No. Transport acknowledgment is not application-level confirmation of the requested outcome.
4. Can a later missing socket row erase an earlier genuine response? No. Record the observation times and explain the limited state shown by each source.
5. Is a fictional SYN sequence executed evidence? No. It is explanatory material unless the actual packets were collected under separate authorization, which this lesson does not provide.

Use the original exercise's minimal evidence and final-state requirements. A professional conclusion is precise about the observed layer, destination, time and limitations. It does not require discovering a vulnerability to be useful.

Technical reading: RFC 9293, especially key TCP concepts, connection state and sequence-number acknowledgments. No packet-level or student-hardware execution is claimed.
