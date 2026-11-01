import importlib.util
import json
import pathlib
import types
import unittest
from unittest.mock import patch

path = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "recover-admin-prompt.py"
spec = importlib.util.spec_from_file_location("recovery_prompt", path)
prompt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prompt)


class RecoveryPromptTests(unittest.TestCase):
    def test_requires_a_terminal(self):
        with patch.object(prompt.sys, "stdin", types.SimpleNamespace(isatty=lambda: False)), patch.object(prompt.subprocess, "run") as run:
            self.assertEqual(prompt.main(), 1)
            run.assert_not_called()

    def test_passes_password_over_stdin_only_after_confirmation(self):
        password = "fictional-password-123"
        with patch.object(prompt.sys, "stdin", types.SimpleNamespace(isatty=lambda: True)), patch("builtins.input", side_effect=["STOPPED", "owner@example.test"]), patch.object(prompt.getpass, "getpass", side_effect=[password, password]), patch.object(prompt.subprocess, "run", return_value=types.SimpleNamespace(returncode=0)) as run:
            self.assertEqual(prompt.main(), 0)
            args, options = run.call_args
            self.assertNotIn(password, " ".join(args[0]))
            self.assertEqual(json.loads(options["input"])["password"], password)

    def test_does_not_run_when_passwords_differ(self):
        with patch.object(prompt.sys, "stdin", types.SimpleNamespace(isatty=lambda: True)), patch("builtins.input", side_effect=["STOPPED", "owner@example.test"]), patch.object(prompt.getpass, "getpass", side_effect=["fictional-password-123", "fictional-password-456"]), patch.object(prompt.subprocess, "run") as run:
            self.assertEqual(prompt.main(), 1)
            run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
