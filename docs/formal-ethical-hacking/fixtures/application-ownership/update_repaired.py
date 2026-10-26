"""Text-only writable-field reference over the same in-process update handler."""
from update_lab import UpdateApplication, main


def make_app():
    return UpdateApplication(("text",))


if __name__ == "__main__":
    raise SystemExit(main(make_app))
