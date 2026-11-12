# EH-AUTO-01 — Validate a target specification before any action

Draft offline practical, not published. Requires EH-ASSESS-01, EH-NET-01 and the Python bridge in EH-WEB-04. Proposed ID only, not runtime registration. This exercise evaluates input values only; no network action is permitted or implemented.

## Outcomes
Separate syntactic validity from policy membership, compare parsed address objects rather than text prefixes, validate a port's type and value, and explain why a local predicate is not authorization.

## Scope and preparation
Use only scope_lab.py and test_scope_lab.py in a fresh disposable directory on your own clean guest. Python 3 with unittest and ipaddress is required. No socket library, DNS lookup, subprocess, HTTP client, scanner, database or credentials are used. No pip, sudo or network connection is needed.

The documentation addresses and .invalid name in the tests are synthetic input values, not targets to contact. Obtain files through the approved material-transfer process and read them before execution. Do not connect this teaching function to Nmap, curl, a bot or an academy authorization adapter.

## Define the exact contract
For this fictional predicate, the only accepted pair is target string 192.0.2.20 and integer port 8000. The target must be a string parsed as a single address, not a hostname, integer or network expression. The port must be an actual Python int, not bool, text or a floating-point value, and must be in the ordinary 1 through 65535 range. Every other pair returns False.

This narrow contract does not represent a complete lab scope: protocol, actor, time window, method, request budget, ownership, environment and revocation are absent. A True result never grants permission or establishes reachability. Actual authorization remains separate.

## Read the flawed decision
The starter parses the address but accepts a broad textual prefix and ignores the port. That confuses being inside an address family/block with membership in the explicitly allowed pair. A syntactically valid neighbor address can still be outside policy. A private-looking or documentation address is not an authority signal.

Python's ip_address accepts several input representations, including integers. A library's accepted types can be broader than an application's contract, so validate the expected input type as well as parsing. Similarly, Python booleans are a subclass of integers; a general integer-isinstance check may accept True even when the contract excludes it.

OWASP distinguishes syntactic and semantic input validation. Here parsing concerns representation, while exact pair membership concerns the exercise policy. Neither substitutes for external authorization or safe downstream execution.

## Predict and run
From the fixture directory run:
```sh
python3 -m unittest -v test_scope_lab
```
Capture the actual status promptly. The suite is one unittest method with 12 named subcases, not 12 independent test methods. Predict which cases reveal excess address scope, ignored ports and representation issues before execution. Record real failures rather than copying author output.

## Repair without broadening policy
Retain rejection of non-string target input and invalid address representations. Compare the parsed address with the exact permitted address. Validate the port's actual type and range and compare it with the exact permitted port. Return a Boolean and fail closed for all other values covered by the contract.

Do not coerce every value to a string or integer to make tests pass. Do not accept a whole /24 because one endpoint is permitted. Do not use DNS resolution, automatic redirects or retry loops: none belongs to this function. Keep existing test expectations unchanged.

Add independent cases for a floating-point port, another wrong integer port, a malformed address and a target of the wrong input type. Predict each result before running. Do not add real targets or a network transport to demonstrate your answer.

## Limits of the model
A real automation system needs trusted policy configuration, a clear execution boundary, safe argument handling, bounded operations and controls for all applicable context. A unit-tested predicate that is never called before an action provides no enforcement. A hard-coded teaching pair is not a general production scope engine.

If future software accepts names or redirects, address changes and destination checks require explicit design and authorization; this exercise does not solve them. Do not claim protection against DNS rebinding, proxy routing, IPv6 alternatives or changes in real target ownership from these tests.

## Deliverables and review
Submit the contract, actual baseline and repaired results, minimal diff, independent cases and limitations. Explain why parse success, scope membership, authorization and execution are distinct decisions. Use only the approved private evidence workflow. Formal grading, supported-guest reproduction, accessibility review and navigation integration remain pending.

Sources:
https://docs.python.org/3/library/ipaddress.html
https://devguide.owasp.org/en/04-design/02-web-app-checklist/05-validate-inputs/

See SCOPE-VALIDATION-CHECKS.md for bounded local author results.


## Extended teaching: validate a value without taking an action

The teaching function remains offline. Its accepted pair is exactly the target string 192.0.2.20 and the actual integer port 8000. Do not connect it to a transport, scanner, bot or authorization adapter. A documentation address is an input value here, not a destination to contact.

Use four separate questions when reviewing the function. Does the input have the contract's required type? Does it parse as the required kind of value? Does the parsed value match the exercise policy? Does an external authority permit a particular operation now? The original predicate addresses the first three for one hard-coded pair. It does not address the fourth or implement an operation.

## Worked classification: representation is not membership

Consider the accepted target with port 8000. Its expected result is True because both values meet this fictional contract. Now keep the port and change the target to another syntactically valid address. Parsing can succeed while exact membership fails; the expected result is False. That difference is why a textual prefix or broad network comparison is not the specified repair.

Next keep the target and provide port text rather than an integer. The expected result is False, even if the text looks like the permitted number. Converting it to an integer would silently replace the stated input contract with a more permissive one. The same reasoning rejects a floating-point representation and the Boolean True. Do not treat “could be converted” as “is permitted.”

An integer address input also conflicts with the target-string contract even if a parsing library accepts integers. The application must define and enforce its own input shape rather than inherit every representation the library happens to understand.

## Exercise: construct a decision table before editing

For each original named subcase, record target type, parse expectation, address-membership expectation, port type/value expectation and final expected Boolean. Keep those expectations unchanged. Then add the four independent categories already requested: floating-point port, another wrong integer port, malformed address and wrong target type. Use only synthetic values and local unit tests.

Explained answer: the permitted address with an actual integer 8000 is the positive control. A valid neighboring address distinguishes parsing from membership. The correct address with another ordinary integer port distinguishes address acceptance from pair acceptance. A malformed address exercises parsing failure. Wrong types exercise the outer contract before any conversion broadens it. A test table should reveal which decision a failing case is meant to examine.

Keep the original suite's counting honest: one unittest method can contain multiple named subcases. Report actual results in those terms rather than relabeling subcases as independent methods. Preserve the baseline failure evidence before making the minimal repair, then compare the repaired result with the same expectations.

## Troubleshooting a deceptively successful repair

If all cases pass after you changed their expected outcomes, you have not demonstrated the specified repair. If only the allowed pair is tested, broad acceptance can remain invisible. If every value is rejected, negative cases can pass while the positive behavior is broken. Use both kinds of case and explain the exact failure each is intended to expose.

A passing local predicate also provides no evidence of enforcement unless a separately designed system uses the decision at its execution boundary. That is a limitation to describe, not a request to add network code to this exercise. Do not introduce name resolution, redirects, retries or real credentials to make the example appear more realistic.

## Bounded human-led AI critique

You may ask an AI assistant to review the fictional decision table for a missing wrong-type or wrong-port case. Do not supply secrets or ask it to choose real targets. Keep the contract and existing expectations fixed. Reject suggestions to coerce inputs, broaden the permitted network, resolve hostnames or attach a transport. You remain responsible for the minimal local diff and the explanation; an AI assertion that the function is “secure” is not a supported result.
