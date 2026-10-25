"""Original visible requirements reused against the reference factory."""
import test_export as cases
import export_repaired
class ReferenceTests(cases.ExportTests):
    factory = staticmethod(export_repaired.make_app)
