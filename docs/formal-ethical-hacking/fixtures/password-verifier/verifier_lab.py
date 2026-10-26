"""Offline verifier teaching model. Never use real credentials or deploy this format."""
import base64
import hashlib
import hmac
import json
import re
import secrets
import sys

ITERATIONS = 600000
SCHEME = "teaching-pbkdf2-sha256"
DEMO_PASSWORD = "FICTIONAL-password-01"


def password_bytes(password):
    if not isinstance(password, str) or not 1 <= len(password) <= 128:
        raise ValueError("Unexpected teaching password")
    try:
        encoded = password.encode("utf-8")
    except UnicodeEncodeError as error:
        raise ValueError("Unexpected text encoding") from error
    if len(encoded) > 512:
        raise ValueError("Teaching input too large")
    return encoded


def derive(encoded, salt):
    kdf = getattr(hashlib, "pbkdf2_hmac", None)
    if not callable(kdf):
        raise RuntimeError("Required password KDF unavailable")
    return kdf("sha256", encoded, salt, ITERATIONS, dklen=32)


def make_record(password):
    encoded = password_bytes(password)
    salt = secrets.token_bytes(16)
    return {"scheme": SCHEME, "iterations": ITERATIONS,
            "salt_hex": salt.hex(), "digest_hex": derive(encoded, salt).hex()}


def parse_record(record):
    if not isinstance(record, dict) or set(record) != {"scheme", "iterations", "salt_hex", "digest_hex"}:
        raise ValueError("Unexpected verifier shape")
    if record["scheme"] != SCHEME or type(record["iterations"]) is not int or record["iterations"] != ITERATIONS:
        raise ValueError("Unexpected verifier parameters")
    salt_hex, digest_hex = record["salt_hex"], record["digest_hex"]
    if not isinstance(salt_hex, str) or re.fullmatch(r"[0-9a-f]{32}", salt_hex) is None:
        raise ValueError("Unexpected salt representation")
    if not isinstance(digest_hex, str) or re.fullmatch(r"[0-9a-f]{64}", digest_hex) is None:
        raise ValueError("Unexpected digest representation")
    return bytes.fromhex(salt_hex), bytes.fromhex(digest_hex)


def verify(password, record):
    try:
        encoded = password_bytes(password)
        salt, expected = parse_record(record)
    except ValueError:
        return False
    actual = derive(encoded, salt)
    return hmac.compare_digest(actual, expected)


def run_demo():
    encoded = password_bytes(DEMO_PASSWORD)
    first, second = make_record(DEMO_PASSWORD), make_record(DEMO_PASSWORD)
    return {"synthetic": True,
            "base64_roundtrip": base64.b64decode(base64.b64encode(encoded)) == encoded,
            "unsalted_digest_repeats": hashlib.sha256(encoded).digest() == hashlib.sha256(encoded).digest(),
            "new_salts_differ": first["salt_hex"] != second["salt_hex"],
            "verifier_records_differ": first != second,
            "correct_password_accepted": verify(DEMO_PASSWORD, first),
            "wrong_password_rejected": not verify("FICTIONAL-wrong", first),
            "malformed_record_rejected": not verify(DEMO_PASSWORD, dict(first, iterations=True))}


def main():
    if len(sys.argv) != 1:
        print("No arguments accepted; use invented built-in values only", file=sys.stderr)
        return 2
    try:
        report = run_demo()
    except (OSError, RuntimeError, ValueError):
        print("Teaching run blocked; inspect the approved local setup", file=sys.stderr)
        return 2
    print(json.dumps(report, sort_keys=True))
    return 0 if all(report.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
