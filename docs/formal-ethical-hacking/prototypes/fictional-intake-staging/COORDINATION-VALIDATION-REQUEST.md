# Coordinated staging pilot validation request

Validate the branch containing pilot wiring commit b3af9d18335abf16d4e9102e2805a2cf50a4d376.

Run the existing fictional-staging-batch workflow across Node 20/22 and PostgreSQL 16/18 using disposable CI databases. Include all fictional-intake-staging/*.test.mjs tests.

This request does not authorize deployment, live database mutation, journal reconciliation, Discord channel deletion, permission changes, or credential changes.

Do not treat earlier component tests as a passing full-pilot result. Use the workflow evidence summary for the exact validation commit and all four matrix jobs.
