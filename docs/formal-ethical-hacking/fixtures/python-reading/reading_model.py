"""Synthetic Python-reading practice, not a security or readiness control."""
from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class PracticeRun:
    label: str
    status: int
    tags: Tuple[str, ...]


def describe_status(status: int) -> str:
    if status == 0:
        return "success"
    return "nonzero"


def summary(run: PracticeRun) -> str:
    return run.label + ": " + describe_status(run.status)


def needs_review(run: PracticeRun) -> bool:
    return run.status != 0 or "reviewed" not in run.tags
