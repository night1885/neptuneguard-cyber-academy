import unittest
from upload_lab import MAX_BYTES, PNG_PREFIX, UploadRequest, admit_demo_upload


class UploadPolicyTests(unittest.TestCase):
    def request(self, filename="note.png", declared_type="image/png", contents=None):
        return UploadRequest(filename, declared_type, PNG_PREFIX + b"DEMO" if contents is None else contents)

    def test_nominal_synthetic_prefix_case(self):
        self.assertTrue(admit_demo_upload(self.request()))

    def test_wrong_declared_type(self):
        self.assertFalse(admit_demo_upload(self.request(declared_type="text/plain")))

    def test_wrong_extension(self):
        self.assertFalse(admit_demo_upload(self.request(filename="note.txt")))

    def test_extra_suffix(self):
        self.assertFalse(admit_demo_upload(self.request(filename="note.png.txt")))

    def test_path_component(self):
        self.assertFalse(admit_demo_upload(self.request(filename="../note.png")))

    def test_oversized_contents(self):
        self.assertFalse(admit_demo_upload(self.request(contents=PNG_PREFIX + b"x" * MAX_BYTES)))

    def test_missing_prefix(self):
        self.assertFalse(admit_demo_upload(self.request(contents=b"ordinary synthetic text")))

    def test_empty_contents(self):
        self.assertFalse(admit_demo_upload(self.request(contents=b"")))

    def test_uppercase_extension_outside_contract(self):
        self.assertFalse(admit_demo_upload(self.request(filename="note.PNG")))

    def test_exact_teaching_size_boundary(self):
        self.assertTrue(admit_demo_upload(self.request(contents=PNG_PREFIX + b"x" * (MAX_BYTES - len(PNG_PREFIX)))))


if __name__ == "__main__":
    unittest.main()
