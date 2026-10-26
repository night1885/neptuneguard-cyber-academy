"""Deliberately flawed offline scope model. Never authorizes traffic."""
from ipaddress import ip_address


def in_scope(target, port):
    if not isinstance(target, str):
        return False
    try:
        address = ip_address(target)
    except ValueError:
        return False
    return address.version == 4 and str(address).startswith("192.0.2.")
