"""Deliberately flawed path check. Disposable offline teaching only."""
from pathlib import Path


def resolve_candidate(base, requested):
    base = Path(base).resolve(strict=True)
    requested = Path(requested)
    if requested.is_absolute():
        raise ValueError("absolute input is not allowed")
    candidate = (base / requested).resolve(strict=True)
    if not str(candidate).startswith(str(base)):
        raise ValueError("outside base")
    return candidate
