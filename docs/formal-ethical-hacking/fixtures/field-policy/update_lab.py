"""Deliberately flawed update mapper. Synthetic offline teaching only."""


def apply_changes(current, changes):
    updated = dict(current)
    updated.update(changes)
    return updated
