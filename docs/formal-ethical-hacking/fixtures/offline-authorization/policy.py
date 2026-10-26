"""Deliberately flawed offline teaching model. Not production authorization."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Subject:
    subject_id: str
    role: str
    courses: tuple


@dataclass(frozen=True)
class Submission:
    owner_id: str
    course: str
    state: str


def allowed(subject, action, resource):
    if subject is None or resource.state not in ("draft", "submitted"):
        return False
    if subject.role == "instructor":
        return action == "read" and resource.course in subject.courses
    if subject.role == "student":
        return (
            action in ("read", "edit")
            and resource.course in subject.courses
            and resource.state == "draft"
        )
    return False
