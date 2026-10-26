import copy
import unittest
from check_catalogue import validate


class CatalogueTests(unittest.TestCase):
    def setUp(self):
        self.data = {"schemaVersion": 1, "status": "draft-not-published", "runtimeIntegration": False, "publishable": False, "labDelivery": "student-built", "lessons": [{"id": "EH-LAB-00", "requires": []}, {"id": "EH-LAB-01", "requires": ["EH-LAB-00"]}]}
        self.files = {"EH-LAB-00.md", "EH-LAB-01.md"}

    def test_valid(self):
        self.assertEqual(validate(self.data, self.files), [])

    def test_duplicate_id(self):
        self.data["lessons"].append(copy.deepcopy(self.data["lessons"][0]))
        self.assertTrue(validate(self.data, self.files))

    def test_unknown_dependency(self):
        self.data["lessons"][1]["requires"] = ["EH-LAB-99"]
        self.assertTrue(validate(self.data, self.files))

    def test_cycle(self):
        self.data["lessons"][0]["requires"] = ["EH-LAB-01"]
        self.assertTrue(validate(self.data, self.files))

    def test_missing_file(self):
        self.assertTrue(validate(self.data, set()))

    def test_bad_prerequisite_shape(self):
        self.data["lessons"][1]["requires"] = "EH-LAB-00"
        self.assertTrue(validate(self.data, self.files))

    def test_no_publication_or_runtime(self):
        for key in ("publishable", "runtimeIntegration"):
            data = copy.deepcopy(self.data)
            data[key] = True
            self.assertTrue(validate(data, self.files))

    def test_hosting_policy(self):
        self.data["labDelivery"] = "hosted"
        self.assertTrue(validate(self.data, self.files))

    def test_invalid_root(self):
        self.assertTrue(validate([], self.files))

    def test_boolean_schema_rejected(self):
        self.data["schemaVersion"] = True
        self.assertTrue(validate(self.data, self.files))


if __name__ == "__main__":
    unittest.main()
