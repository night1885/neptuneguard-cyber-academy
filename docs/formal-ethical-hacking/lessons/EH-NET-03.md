# EH-NET-03 — Names, DNS and failure boundaries

Draft; not published. Requires EH-NET-02. Conceptual and paper exercises only: the offline lab currently has no authorized DNS service. Do not attach an external resolver or query public infrastructure for this lesson. Community Learning is unchanged.

## Outcomes
Explain a resolver, distinguish DNS records from IP routing, and avoid treating every failed application request as a DNS failure.

## Your task and finish line
Read the model and tool-role comparison, reason through the same three fictional diagnostic cards, and complete the existing concept map and explanations. Finish by identifying which stage each supplied observation supports, what remains unknown and the next question to ask. No tool installation, DNS command, network query, packet capture or configuration change is required or authorized here.

This lesson develops diagnostic reasoning; it does not demonstrate practical DNS-tool competence. A proposed next question is not permission to execute another test. Keep fictional observations separate from any actual evidence from earlier lessons.

## 1. Why names exist — more than a name-to-IP list
Applications can use human-readable names rather than literal addresses. DNS organizes names hierarchically and returns typed information called resource records. The hierarchy describes a name space, not a map of IP subnets or a list of authorized assessment targets. A domain name and an IP address are different identifiers.

A question identifies the name and the type of information requested. The same name can be associated with different record types; an answer to one question does not establish every possible property of that name. DNS is not merely a single global name-to-IP spreadsheet.

| Record type or concept | Basic meaning | What it does not establish |
|---|---|---|
| A | Associate the name with an IPv4 address in the Internet class | That the address is reachable, exclusively owned or authorized for testing |
| AAAA | Associate the name with an IPv6 address | That an IPv6 path or the intended application is available |
| CNAME | Identify an alias and its canonical name | An HTTP redirect, successful connection or permission to follow an assessment target elsewhere |
| NS | Identify a name server associated with authoritative service for the relevant domain/zone | That the same server provides recursive service to every client |
| TTL | Cache-lifetime information for the record in the basic caching model | Service uptime, target ownership, universal instantaneous agreement or a testing time window |

These are reading concepts, not records collected from the student lab. Do not invent a zone, name server, answer, timestamp or tool transcript to make the table appear executed.

## 2. Distinguish the application, resolver and authoritative role
A resolver obtains answers on behalf of a client, potentially using cached data or other servers. An authoritative server answers for the zones it serves. Recursive resolution and authoritative service are different roles, even when one installation can perform more than one role.

In the basic model, a client can ask a recursive service to obtain an answer. That service may already have suitable cached information or may consult other name servers. A referral points toward another relevant name server; it is not the same thing as the final requested address answer. The exact exchanges depend on configuration and cache state.

Do not draw a fresh root-to-authoritative exchange for every lookup as if it were an observed trace. No DNS packets have been captured in this exercise. Likewise, a resolver returning a cached answer is not thereby the authoritative source of the zone data. Cache state and authoritative responsibility answer different questions.

Answers can change over time and cached information has a lifetime. A cached answer is not automatically wrong because it differs from a later observation, and a recently returned answer is not automatically proof of authoritative service. Identify which source, time and record question an observation actually describes. This introductory model is not a complete account of later DNS standards or every cache policy.

## 3. Separate name lookup from the rest of the request
Use this as a concept-map outline, not an execution transcript:

```text
Application uses a name
  -> its configured name-lookup path
     -> available local/cached information or DNS information
        -> destination address information
           -> local routing decision
              -> transport connection attempt
                 -> application request and response
```

Different applications and operating systems can use different lookup paths. Local name lookup can involve sources other than DNS. On a glibc-based Linux system, the Name Service Switch configuration can select sources and their order for host lookups. A hosts-file entry is not a DNS resource record served by an authoritative DNS server. This lesson does not authorize reading unrelated name-service databases, changing resolver settings or editing hosts files.

DNS helps obtain information used by an application. Routing chooses paths for IP destinations. A successful name lookup does not establish transport reachability; a working route does not establish that a name resolves. A transport connection is not a completed HTTP operation. Keep those stages separate when explaining a failure.

### Apply the distinction to the existing clean peer
The earlier permitted requests used the literal IPv4 address 192.0.2.20 on TCP port 8000, with proxy bypass. That intended path does not require resolving a target hostname. If that request fails, a missing DNS server is not an adequate explanation by itself. Other parts of a wider system can involve name lookup, but that possibility is not evidence of this request's failure cause.

Do not fix DNS by adding internet connectivity to an isolated exercise. A public resolver would not start a stopped peer service, restore a missing guest address or repair an incorrect internal-network name. A version header, listener row, route decision and name-resolution answer are different observations with different limits.

## 4. Know what the relevant tools would answer — reading only
The tools of the trade need an explicit purpose. Their names are introduced here to distinguish evidence sources, not to authorize commands or imply the tools are installed, compatible or practically assessed. Do not run a lookup merely because it appears to be an information-only command.

| Tool or existing observation | Question it can help address in an authorized setting | Limit and present boundary |
|---|---|---|
| dig | What DNS response did the selected name server return for the selected question? | It performs DNS queries; defaults can select configured servers. No query or server is authorized in this lesson |
| nslookup | What does the queried name server report through this DNS-query tool? | It is not proof that an application uses the same lookup path, cache or address choice; no query is authorized here |
| getent host-related lookup | What does the configured Name Service Switch lookup return on that platform? | This is not necessarily a direct DNS-only observation and can involve configured network sources; do not invoke it for this lesson |
| Existing ip route get observation | What local route decision was selected for the specified lab IP? | It is not a DNS query, reachability proof or evidence that the HTTP service is running |
| Existing peer listener and curl observations | What local endpoint or bounded HTTP behaviour was observed in the earlier authorized exercise? | They are not a captured DNS exchange or handshake; this reading does not authorize a repeat |

A command's output depends on its implementation, arguments, selected server/source and environment. A different result between tools is a question to investigate under an approved plan, not immediate proof that one tool is broken. Do not substitute an internet target, install a DNS package, flush a cache or modify name-service configuration to manufacture matching output.

In a future separately authorized practical, evidence would need the exact question, tool/version, selected server or lookup path, relevant configuration and actual result. This is a description of missing practical requirements, not an extra submission or permission to gather that data now.

## 5. Work through a failure without skipping stages
For each supplied card, use the same reasoning pattern:
1. Observation: state only what the card actually supplies.
2. Interpretation: identify the stage supported by that observation.
3. Unknowns: name two facts the observation does not establish.
4. Next question: identify what would help distinguish explanations while respecting the existing scope.

A question is not an executed test. If the useful observation would require an unapproved DNS service or external connection, state that authorization/setup is missing instead of performing it. Do not turn a generic application error into an invented authoritative DNS response.

## 6. Fictional diagnostic cards — not transcripts
A. A configured name resolves to an address, but the transport attempt times out. Name resolution succeeded in that observation; further diagnosis concerns the specified path, endpoint and controls, without assuming one root cause.

B. An application reports that a name could not be resolved. That is not evidence that its intended web service is down. The request may not have reached the stage of contacting that service.

C. The literal-address request to the clean peer fails while its service is stopped. Adding a public resolver would not start the service and would violate the intended setup.

These are the same three provided observations for reasoning practice, not executed lab evidence. Do not add packet captures, response codes, record values or successful tool runs that the cards do not supply. A diagram or well-written answer cannot convert them into a completed DNS practical.

## 7. Existing independent work
For each card, identify the observed fact, one justified interpretation, two unknowns and the next question to ask. Explain the difference between a cached answer and an authoritative role. Explain why a DNS answer containing a new address never expands an assessment's target scope automatically.

Use your own causal explanation rather than a memorized tool-output string. A proposed diagnostic action that exceeds current scope remains unexecuted. No fourth card, additional query or new technical assessment is added.

## 8. Assessment and next gate
Submit the existing short concept map linking application, resolver, records, destination address, routing and transport. Label provided fictional material clearly and keep it separate from earlier actual lab observations. Drafting in accessible text is sufficient; no screenshot, live DNS answer or new software is required.

A reviewer should look for the correct role and stage distinctions, a justified interpretation for each card, two explicit unknowns, and a bounded next question. Feedback should identify the precise unsupported inference or confused stage and request a focused explanation. Do not ask the learner to run an unapproved query to make a paper answer look stronger. Review clarity and causal reasoning rather than memorized tool output.

Formal pass thresholds, resubmission policy and assessor calibration are not established here. Use the actual approved private submission route only after its access, collection and retention rules exist. This Markdown file is not a collection system, and reading or submission does not grant progression, lab permission or an award.

A practical DNS fixture, resolver configuration and query permissions still need separate design and validation before any DNS lab is released. Hardware reproduction, a supported tool/environment route and genuine independent performance cannot be inferred from these conceptual answers.

## Sources and authoring boundary
- RFC 1034, DNS concepts and facilities: https://www.rfc-editor.org/info/rfc1034/ . This foundational reference has later updates and is not a complete specification of modern DNS, every record type or current cache behaviour.
- BIND DNS-query tool documentation: https://bind9.readthedocs.io/en/v9.18.24/manpages.html . This is a documentary reference, not a course-selected or tested tool version.
- getent and Name Service Switch: https://man7.org/linux/man-pages/man1/getent.1.html and https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html . These describe platform-specific lookup behaviour, not a universal path for every application.

Sources consulted 2026-11-02. This expands the existing EH-NET-03 teaching while preserving EH-NET-02 as its prerequisite, paper-only scope, three fictional cards and existing concept-map/independent tasks. It introduces no live DNS target, query permission, resolver change, new canonical ID, prerequisite edge, runtime integration, publication flag, Discord handler, database change or deployment.

No DNS-client command, Name Service Switch lookup, resolver installation/configuration, DNS fixture, student-guest execution, practical tool assessment, full repository suite or assessor calibration was performed for this authoring batch. The existing reading-profile/compiler sources and their integrity guards are unchanged; no new reading snapshot is activated by editing this lesson.
