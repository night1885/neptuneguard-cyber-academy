# Evaluate file upload policy without uploading dangerous content

## Outcome and prerequisites

Explain which properties an upload function must validate and how storage, naming, content type and serving combine. Complete JSON, authorization and output-context lessons. Use only harmless synthetic files on a program-permitted feature. Never upload executable server-side scripts, malware, oversized files or content designed to execute.

PortSwigger describes upload failures as arising when name, type, contents or size are not sufficiently validated and when the stored file can later be executed or served unsafely. Client-supplied Content-Type and filename are untrusted. Blacklists miss alternatives; allowlists are easier to reason about. Storing outside executable paths, server-selected names, size limits and framework handling are separate controls.

## Offline policy exercise

```bash
python3 - <<'PY'
from pathlib import PurePosixPath
allowed = {'.txt'}
def accept(name, client_type, data):
    path = PurePosixPath(name)
    return (len(path.parts) == 1 and not path.is_absolute()
            and path.suffix.lower() in allowed
            and client_type == 'text/plain' and len(data) <= 128
            and b'\x00' not in data)
for name, kind, data in [
    ('note.txt', 'text/plain', b'Synthetic note'),
    ('note.txt.jpg', 'text/plain', b'Synthetic note'),
    ('../note.txt', 'text/plain', b'Synthetic note'),
    ('photo.jpg', 'image/jpeg', b'<html>not an image</html>'),
]:
    print(name, kind, accept(name, kind, data))
PY
```

Expected True only for the first row. The model uses only virtual names and bytes and opens no file. A real policy must also consider content inspection, storage naming, authorization, serving headers and processing libraries.

## Program-based procedure

1. Identify the permitted upload feature, purpose, size limits and retention behavior. Do not assume uploads are private or removable.
2. Prepare a tiny harmless text or sample image that is clearly yours. Remove metadata and personal information.
3. Use the normal UI once. Observe the response, resulting URL, content type and who can view it. Record only the minimum evidence.
4. If the program explicitly allows boundary checks, plan one harmless variation with an expected rejection or acceptance and a removal route. Do not use executable names, path traversal, polyglots or race attempts.
5. If no safe permitted comparison exists, document the policy question and stop.

## Exercise and explained answers

Why is a JPEG content type insufficient? The client controls it. The server should validate actual content and serve it safely.

If an upload is rejected, can you try many extension variants? No. Respect the stated budget and permission. The first observation is enough to report only if it demonstrates a supported boundary issue.

## Troubleshooting and cleanup

Delete only your synthetic upload through the normal route. If it cannot be removed, note that residual state. Do not retry with larger files or executable types.

## Source and validation limit

https://portswigger.net/web-security/file-upload

The executable model checks strings and bytes only. No upload or server execution was tested.
