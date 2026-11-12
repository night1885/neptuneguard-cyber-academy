# Linux process evidence: observe only the child you created

Supporting consolidated-course draft, not a canonical ID, native incident collector or permission to inspect unrelated processes. This practical is the owned-process part of fixtures/native-observation/verify_native.py. It is useful to both assessor and responder reasoning, but adding it to an Ethical Hacking owner review does not register a new Incident Response module.

## Outcomes and boundary
Explain a PID, parent PID, process-instance context and start time after boot. Obtain a genuine bounded Linux observation without collecting unrelated process lists, command lines, files or credentials. Separate native observations from synthetic incident fixtures and from proposed actions. Existing reviewed student setup, ordinary-user execution and private evidence rules remain prerequisites; no installation, sudo, service change or protection bypass is requested.

The helper creates a harmless Python child that sleeps briefly, reads only that child's /proc/PID/stat, checks that the PID and parent match the process it created, records selected fields and terminates/reaps the child in a finally block. It never accepts a caller-supplied PID. The script reports a non-Linux/missing-proc limitation instead of inventing an equivalent Windows output. Strict CI mode requires the Linux observation to execute.

## Model the evidence before parsing
A process name is not a permanent identity and a PID can be reused. The same numeric PID on another host or boot is not the same process instance. Parent context and start observations help constrain a join, but a point-in-time record is not a complete history. An unfamiliar name is not proof of malware, and a familiar name is not proof of legitimacy.

The Linux stat format contains a parenthesized command field. Names can contain spaces and parentheses, so splitting the complete line on whitespace can shift every later field. The parser isolates that field before interpreting the remaining columns. The starttime field is measured after boot in clock ticks; sysconf reports ticks per second. Neither value is an ISO timestamp. The helper deliberately performs no UTC conversion because boot/reference-clock assumptions would be additional work to establish.

## Guided observation
Read parse_stat and observe_child, then run the named tests and helper from the service-discovery unit. Identify which checks use synthetic parser strings and which create actual local HTTP observations. The command's owned_process result supplies the selected actual child observation; it is not a captured record from Harbor Ledger or the learner's workplace.

Write down the observed PID, PPID, command field, process state, start ticks and tick rate. Explain the strongest claim supported: these fields were observed for this child at this time. They do not prove application authorisation, network behaviour, a service account's token, malware status, all process ancestry or a complete incident scope. Do not publish unnecessary identifying host/account output.

## Preservation and cleanup
The helper records a structured result rather than storing a broad process dump. Keep that output separate from fictional case data. Hashing the result later can support byte comparison but cannot authenticate an unrelated export or establish legal custody. No suspicious command line is executed to learn its meaning.

Cleanup verifies that the created child terminated and was reaped. The listener portion separately checks closure of its managed socket and worker. These selected checks do not prove cleanup after every possible crash or forced kill and do not justify reconnecting to a released port, which could be reused by another process. Record a failure honestly and use the actual support route rather than broad system termination commands.

## Independent reasoning
Use derived synthetic stat strings to test names containing spaces/parentheses and a truncated record. Explain why rejection is better than silently shifting fields. Compare two records with a reused PID but different start ticks or boot context and state what further information would be required for a reliable temporal join. Do not extend the helper to inspect another PID as part of this exercise.

Submit the selected genuine observation, parser explanation, source/clock limitations, cleanup result and a bounded proposal for future native incident collection. Native Windows/EVTX, memory acquisition, real endpoint investigation, student-platform support and professional assessment remain separately unvalidated; this one successful Linux route does not close them.

Sources: https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html ; https://docs.python.org/3/library/subprocess.html ; https://docs.python.org/3/library/os.html .
