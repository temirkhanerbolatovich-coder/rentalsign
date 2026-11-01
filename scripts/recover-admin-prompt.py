#!/usr/bin/env python3
"""Interactive front end: pass recovery credentials to Node over stdin only."""
import getpass
import json
import pathlib
import subprocess
import sys
import warnings


def main():
    if not sys.stdin.isatty():
        print("Требуется интерактивный терминал; пароль нельзя вводить в командной строке.", file=sys.stderr)
        return 1
    print("Остановите все копии приложения и дождитесь завершения запросов на вход.")
    if input("Если это выполнено, введите STOPPED: ") != "STOPPED":
        print("Восстановление отменено.")
        return 1
    email = input("Email существующего аккаунта: ").strip()
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", getpass.GetPassWarning)
            password = getpass.getpass("Новый пароль (12–128 символов): ")
            confirmation = getpass.getpass("Повторите пароль: ")
    except (getpass.GetPassWarning, EOFError, KeyboardInterrupt):
        print("Не удалось безопасно прочитать пароль. Восстановление отменено.", file=sys.stderr)
        return 1
    if password != confirmation or not 12 <= len(password) <= 128:
        print("Пароли не совпадают или длина неверна.", file=sys.stderr)
        return 1
    root = pathlib.Path(__file__).resolve().parent.parent
    try:
        result = subprocess.run(
            ["node", "node_modules/tsx/dist/cli.mjs", "scripts/recover-admin.ts", "--apply", "--maintenance-confirmed"],
            cwd=root,
            input=json.dumps({"email": email, "password": password}),
            text=True,
            check=False,
        )
    except OSError:
        print("Не удалось запустить восстановление. Проверьте установленный Node.js.", file=sys.stderr)
        return 1
    return result.returncode


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (EOFError, KeyboardInterrupt):
        print("Восстановление отменено.", file=sys.stderr)
        sys.exit(1)
