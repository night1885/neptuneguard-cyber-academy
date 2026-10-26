"""Optional visible regression examples for EH-WEB-04; not production checks."""
import unittest
from policy import Subject, Submission, allowed

OWNER = Subject("learner-z", "student", ("course-z",))
OTHER = Subject("learner-y", "student", ("course-z",))
INSTRUCTOR = Subject("tutor-z", "instructor", ("course-z",))
DRAFT = Submission("learner-z", "course-z", "draft")
SUBMITTED = Submission("learner-z", "course-z", "submitted")


class RegressionWorkshopTests(unittest.TestCase):
    def test_instructor_cannot_edit_draft(self):
        self.assertIs(allowed(INSTRUCTOR, "edit", DRAFT), False)

    def test_instructor_can_read_submitted(self):
        self.assertIs(allowed(INSTRUCTOR, "read", SUBMITTED), True)

    def test_owner_cannot_read_submitted(self):
        self.assertIs(allowed(OWNER, "read", SUBMITTED), False)

    def test_renamed_owner_read_and_edit(self):
        for action in ("read", "edit"):
            with self.subTest(action=action):
                self.assertIs(allowed(OWNER, action, DRAFT), True)

    def test_same_course_nonowner_read_and_edit(self):
        for action in ("read", "edit"):
            with self.subTest(action=action):
                self.assertIs(allowed(OTHER, action, DRAFT), False)

    def test_unassigned_instructor_cannot_read_submitted(self):
        other_course = Submission("learner-z", "course-q", "submitted")
        self.assertIs(allowed(INSTRUCTOR, "read", other_course), False)


if __name__ == "__main__":
    unittest.main()
