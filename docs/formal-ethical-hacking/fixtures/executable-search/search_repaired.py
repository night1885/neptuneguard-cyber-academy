"""Explicit-helper-path reference. Not a general executable-trust guarantee."""
import search_lab as fixture


def run_probe(workspace, untrusted_first=False):
    root = fixture.checked_layout(workspace, untrusted_first)
    return fixture.launch(root, str(root / "trusted" / fixture.HELPER), untrusted_first)


if __name__ == "__main__":
    raise SystemExit(fixture.main(run_probe))
