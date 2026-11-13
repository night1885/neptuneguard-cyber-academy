# Distinguish template data from executable instructions

## Outcome and prerequisites

Explain server-side template injection and shell command injection as separate interpretation boundaries. Complete SQL and HTML-output lessons. PortSwigger describes template injection as user input becoming template syntax instead of data. A template evaluation does not automatically establish operating-system command execution.

## Optional local argument-vector exercise

```bash
python3 - <<'PY'
import subprocess, sys
name = 'synthetic; echo SHELL-PARSED'
print('not executed, shell string:', 'echo ' + name)
result = subprocess.run(
    [sys.executable, '-c', 'import sys; print(sys.argv[1])', name],
    capture_output=True, text=True, check=True, timeout=5)
print('argument-vector output:', result.stdout.strip())
assert result.stdout.strip() == name
PY
```

Expected: the complete marker, including its semicolon, appears as one argument. The first line only prints a possible shell string; no shell evaluates it. The subprocess executes the Python interpreter with a fixed short script. This demonstrates one argument boundary, not a complete production defense. Called programs can interpret arguments themselves.

For templates, keep template source fixed and pass values through the engine's data interface. Output encoding addresses the resulting HTML context but does not repair input that already became template source.

## Program-based reasoning and exercise

Identify one permitted feature that formats your controlled content, such as a draft report or preview. Observe normal text flow and distinguish client rendering from server rendering. Record the suspected interpreter and the evidence for it; an error message can be inconclusive.

Do not send operating-system commands, timing probes or callback payloads to complete this lesson. A harmless evaluation comparison requires separate applicable program permission, your own record and a minimal plan. If unavailable, submit a hypothesis worksheet without execution. Never escalate from a marker to command execution merely to increase claimed severity.

## Questions and answers

Does a reflected expression prove evaluation? No. It can be plain text. Describe the actual transformation and alternative explanations.

Does shell=False make every invocation secure? No. You must also consider executable selection, argument semantics, permissions and untrusted options. This example deliberately uses a fixed executable and script.

## Troubleshooting and cleanup

Unexpected formatting may come from client logic or another layer. Do not iterate through engine payloads against a live application. Remove only controlled content through normal routes.

## Source and validation limit

https://portswigger.net/web-security/server-side-template-injection

The local argument-vector example is executed. No template engine, shell evaluation, callback or live injection test was run.
