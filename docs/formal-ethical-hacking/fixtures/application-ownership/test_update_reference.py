"""Same update expectations applied to the explicit text-only reference factory."""
import test_updates as cases
import update_repaired


class ReferenceTests(cases.UpdateTests):
    factory = staticmethod(update_repaired.make_app)
