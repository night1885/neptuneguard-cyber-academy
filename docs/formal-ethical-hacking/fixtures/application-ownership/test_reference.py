"""Same visible request/response contract, directly applied to the repaired policy."""
import test_application as cases
import application_repaired


class ReferenceTests(cases.ApplicationTests):
    factory = staticmethod(application_repaired.make_app)
