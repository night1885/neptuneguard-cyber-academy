# Understand path traversal without reading local files

## Outcome and prerequisites

Explain how filename and path inputs can escape an intended directory and how safe checks work. Complete URL encoding, upload and server-side lessons. Do not request system files, credentials, source code or other applications' data on any real program. A harmless nonexistent path in a permitted location can illustrate behavior only when explicitly allowed.

A path string is interpreted by the application, framework and filesystem, and each layer can normalize differently. A prefix check on an unnormalized string is unreliable. Safer designs avoid user-controlled filesystem paths, map identifiers to server-owned filenames, canonicalize before checking containment and apply operating-system permissions.

## Offline virtual-path exercise

```bash
python3 - <<'PY'
from pathlib import PurePosixPath
root = PurePosixPath('/virtual/uploads')
def contained(candidate):
    path = PurePosixPath(candidate)
    return not path.is_absolute() and '..' not in path.parts and len(path.parts) == 1
for name in ['notes.txt', '../private.txt', '/etc/passwd', 'sub/notes.txt']:
    print(name, root / name, contained(name))
PY
```

Expected: only notes.txt is contained. The path objects are virtual strings; no file is opened or tested. The check is intentionally simplistic and does not model encodings, symlinks or platform differences.

## Program-based reasoning

Identify permitted features that accept names or paths, such as downloads, exports or templates. Observe normal documented names only. Do not substitute system paths, parent segments, encoded separators or null-byte-like input. If the program permits a negative-control test, ask for the exact harmless method and choose a nonexistent controlled resource. An error difference is not proof of disclosure.

If an unrelated file or sensitive content appears unexpectedly, stop, do not copy it and follow the program's secure disclosure process. Do not attempt to read additional files to determine impact.

## Exercise and explained answers

Does rejecting .. prove containment? No. Encodings, normalization and absolute paths can matter, and another layer may interpret input differently.

Why is a server-owned identifier better than user filenames? It removes direct filesystem control from the caller and makes authorization checks explicit.

## Troubleshooting and cleanup

A 404 can mean missing, blocked or mapped elsewhere; it does not identify one cause. Do not enumerate names. Delete only your own harmless test artifacts through permitted routes.

## Source and validation limit

https://portswigger.net/web-security/all-materials

The executable example uses virtual paths only. No file read or live traversal test was performed.
