import pathlib
import sys
import unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from manual_review_failure_context import classify

F = 'test-certification-manual-review-postgres.mjs'

class FailureContextTests(unittest.TestCase):
    def test_sqlstate_precedes_wrapper_code(self):
        text = "code: 'ERR_TEST_FAILURE'\nfailureType: 'uncaughtException'\ncode: '57P01'\nterminating connection due to administrator command"
        self.assertEqual(classify('migration', F, text), 'pg16_migration_L0_57P01_uncaught_exception_administrator_termination')

    def test_assertion_precedes_wrapper_code(self):
        text = "code: 'ERR_TEST_FAILURE'\ncode: 'ERR_ASSERTION'\nfailureType: 'testCodeFailure'"
        self.assertEqual(classify('migration', F, text), 'pg16_migration_L0_ERR_ASSERTION_test_code_failure_assertion')

    def test_stack_location_precedes_parent_location(self):
        text = f"location: '{F}:12:1'\nstack: TestContext.<anonymous> ({F}:47:8)"
        self.assertIn('_L47_', classify('migration', F, text))

    def test_parent_location_is_retained_when_only_location(self):
        self.assertIn('_L12_', classify('migration', F, f"location: '{F}:12:1'"))

    def test_connection_symptoms(self):
        for marker, label in [('ECONNREFUSED', 'connection_refused'), ('Connection terminated unexpectedly', 'connection_lost'), ('timeout exceeded when trying to connect', 'connection_timeout')]:
            with self.subTest(label=label):
                self.assertTrue(classify('migration', F, marker).endswith('_' + label))

    def test_server_timeout_symptoms(self):
        for marker, label in [('canceling statement due to statement timeout', 'statement_timeout'), ('canceling statement due to lock timeout', 'lock_timeout')]:
            with self.subTest(label=label):
                self.assertTrue(classify('migration', F, marker).endswith('_' + label))

    def test_unknown_is_not_invented_cause(self):
        self.assertEqual(classify('migration', F, 'unknown failure'), 'pg16_migration_L0_unknown_unclassified_unclassified')

    def test_native_stage(self):
        result = classify('native', 'test-certification-manual-review-native-postgres.mjs', "code: 'ERR_MODULE_NOT_FOUND'")
        self.assertEqual(result, 'pg16_native_L0_ERR_MODULE_NOT_FOUND_unclassified_unclassified')

    def test_ansi_is_removed(self):
        self.assertIn('_23514_', classify('migration', F, "\x1b[31mcode: '23514'\x1b[0m"))

    def test_output_never_contains_raw_error_or_commands(self):
        text = "PRIVATE_PASSWORD=value\n::error::injected\ncode: 'UNREVIEWED_VALUE'\nfailureType: 'privateValue'"
        result = classify('migration', F, text)
        self.assertRegex(result, r'^pg16_[A-Za-z0-9_]{1,180}$')
        for value in ['PRIVATE', 'PASSWORD', 'value', 'injected', 'UNREVIEWED', '::']:
            self.assertNotIn(value, result)

    def test_input_bound(self):
        self.assertNotIn('57P01', classify('migration', F, 'x' * 262144 + "\ncode: '57P01'"))

    def test_rejects_wrong_stage_file_and_type(self):
        for args in [('other', F, ''), ('migration', '../private', ''), ('migration', F, None)]:
            with self.subTest(args=args):
                with self.assertRaises(ValueError):
                    classify(*args)

if __name__ == '__main__':
    unittest.main()
