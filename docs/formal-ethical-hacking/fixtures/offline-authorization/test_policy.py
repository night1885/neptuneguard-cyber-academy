"""Visible policy examples, not a complete security test suite."""
import unittest
from policy import Subject, Submission, allowed

ALICE = Subject("student-a", "student", ("course-a",))
BOB = Subject("student-b", "student", ("course-a",))
TEACHER = Subject("teacher-a", "instructor", ("course-a",))
DRAFT = Submission("student-a", "course-a", "draft")

CASES = (
    ("owner_read", ALICE, "read", DRAFT, True),
    ("owner_edit", ALICE, "edit", DRAFT, True),
    ("other_student_read", BOB, "read", DRAFT, False),
    ("other_student_edit", BOB, "edit", DRAFT, False),
    ("other_course", ALICE, "read", Submission("student-a", "course-b", "draft"), False),
    ("anonymous", None, "read", DRAFT, False),
    ("assigned_instructor", TEACHER, "read", DRAFT, True),
    ("unassigned_instructor", TEACHER, "read", Submission("student-a", "course-b", "draft"), False),
    ("student_submitted_edit", ALICE, "edit", Submission("student-a", "course-a", "submitted"), False),
    ("unknown_action", ALICE, "delete", DRAFT, False),
    ("unknown_state", ALICE, "read", Submission("student-a", "course-a", "archived"), False),
    ("unknown_role", Subject("visitor-a", "visitor", ("course-a",)), "read", DRAFT, False),
)


class PolicyTests(unittest.TestCase):
    def test_policy_matrix(self):
        for name, subject, action, resource, expected in CASES:
            with self.subTest(case=name):
                self.assertIs(allowed(subject, action, resource), expected)


if __name__ == "__main__":
    unittest.main()
