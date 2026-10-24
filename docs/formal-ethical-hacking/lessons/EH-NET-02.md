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
