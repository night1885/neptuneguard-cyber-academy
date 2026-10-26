"""Visible examples for one synthetic address and integer port."""
import unittest
from scope_lab import in_scope

CASES = (
    ("exact", "192.0.2.20", 8000, True),
    ("neighbor", "192.0.2.21", 8000, False),
    ("wrong_port", "192.0.2.20", 22, False),
    ("string_port", "192.0.2.20", "8000", False),
    ("boolean_port", "192.0.2.20", True, False),
    ("negative_port", "192.0.2.20", -1, False),
    ("oversized_port", "192.0.2.20", 65536, False),
    ("hostname", "peer.training.invalid", 8000, False),
    ("network_not_host", "192.0.2.0/24", 8000, False),
    ("ipv6_not_authorized", "2001:db8::20", 8000, False),
    ("integer_not_string", 3221226004, 8000, False),
    ("invalid", "not-an-address", 8000, False),
)


class ScopeTests(unittest.TestCase):
    def test_scope_matrix(self):
        for name, target, port, expected in CASES:
            with self.subTest(case=name):
                self.assertIs(in_scope(target, port), expected)


if __name__ == "__main__":
    unittest.main()
