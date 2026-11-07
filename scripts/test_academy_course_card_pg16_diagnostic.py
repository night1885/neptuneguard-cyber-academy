import unittest
from academy_course_card_pg16_diagnostic import context, FILE

class DiagnosticTests(unittest.TestCase):
    def test_success_uses_exit_status(self):
        self.assertEqual(context(0, 'unrelated output'), 'PASS')
    def test_timeout(self):
        self.assertEqual(context(1, timed_out=True), 'FAIL_TIMEOUT')
    def test_assertion_and_distinct_locations(self):
        sample = f"{FILE}:12:1 {FILE}:80:9 {FILE}:12:1 code: 'ERR_TEST_FAILURE' code: 'ERR_ASSERTION' operator: 'strictEqual'"
        self.assertEqual(context(1, sample), 'FAIL_L12_80_ERR_ASSERTION_strictEqual')
    def test_no_raw_secret_or_message(self):
        result = context(1, "postgresql://private:secret@example.com/db actual: 'sensitive response' code: 'BAD_SECRET_VALUE'")
        self.assertEqual(result, 'FAIL_L0_UNKNOWN_unknown')
    def test_sqlstate_is_bounded(self):
        self.assertEqual(context(1, "code: '23514'"), 'FAIL_L0_23514_unknown')

if __name__ == '__main__':
    unittest.main()
