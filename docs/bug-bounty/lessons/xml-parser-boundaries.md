# Explain XML parser behavior and declaration boundaries

## Outcome and prerequisites

Describe why XML parsing can create risks beyond ordinary text parsing and how to evaluate an XML-consuming feature without reading files or contacting internal systems. Complete JSON and server-side request lessons. Use only a program-permitted XML feature and harmless documents. Do not request local files, internal addresses, cloud metadata or large expansion documents.

XML supports document type declarations and entity declarations in some parsers. Behavior depends on parser, language, version and configuration. A document that appears simple can be processed by a different component than the one you first observe. Safe designs disable unneeded declaration/entity features, limit size and nesting, and avoid resolving external resources.

## Offline policy exercise

```bash
python3 - <<'PY'
import xml.etree.ElementTree as ET
def parse(text):
    upper = text.upper()
    if len(text) > 1024 or '<!DOCTYPE' in upper or '<!ENTITY' in upper:
        raise ValueError('declarations rejected by teaching policy')
    return ET.fromstring(text).tag
print('ordinary:', parse('<note><title>Synthetic</title></note>'))
try:
    parse('<!DOCTYPE note [<!ENTITY marker "SYNTHETIC">]><note>&marker;</note>')
except ValueError as exc:
    print('declaration:', exc)
PY
```

Expected: ordinary returns note and the declaration example is rejected. This is a narrow input policy, not a hardened XML parser. It does not cover encodings, alternate formats, resource limits or every parser.

## Program-based reasoning

Identify where XML is accepted: API body, upload, import, SAML-like flow or document processing. Do not guess hidden endpoints. Record content type, response format and whether the interface documents XML. A response error from an XML parser shows parser involvement but does not prove entity resolution or exploitable impact.

If the program allows a boundary check, use a tiny harmless document with no external reference and compare only normal acceptance and rejection. Any callback or entity resolution test needs explicit permission, an approved destination you control and a budget. Never retrieve secrets or internal resources to prove impact.

## Exercise and explained answers

If a service rejects a declaration, has XXE been ruled out? No. Another parser path, file type or setting may exist. Report only what you observed.

If it returns a parse error, is there a vulnerability? No. Parse errors are normal. Evidence of unsafe resolution and security impact is needed.

## Troubleshooting and cleanup

Encoding and content-type mismatches can cause parser errors unrelated to security. Do not enlarge payloads or retry repeatedly. Remove only your harmless submitted data through normal routes.

## Source and validation limit

https://portswigger.net/web-security/all-materials

The local code uses a simple policy and does not execute entity expansion or contact a network.
