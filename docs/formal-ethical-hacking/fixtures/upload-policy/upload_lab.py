"""Deliberately incomplete in-memory teaching policy. Never deploy."""
from dataclasses import dataclass

MAX_BYTES = 1024
PNG_PREFIX = b"\x89PNG\r\n\x1a\n"


@dataclass(frozen=True)
class UploadRequest:
    filename: str
    declared_type: str
    contents: bytes


def admit_demo_upload(request):
    return request.declared_type == "image/png"
