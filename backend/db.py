"""Atalho para comandos de migration do Alembic.

Uso:
    python db.py revision -m "cria tabela x"   # gera migration (autogenerate)
    python db.py upgrade [head|-1|rev]          # aplica migrations
    python db.py downgrade [-1|rev]              # reverte migrations
    python db.py stamp [head|rev]                # marca versão sem rodar
"""

import sys

from alembic.config import Config

from alembic import command


def _config() -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("prepend_sys_path", ".")
    return cfg


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return

    cmd, rest = args[0], args[1:]
    cfg = _config()

    if cmd == "revision":
        message = ""
        if "-m" in rest:
            message = rest[rest.index("-m") + 1]
        command.revision(cfg, message=message, autogenerate=True)
    elif cmd == "upgrade":
        command.upgrade(cfg, rest[0] if rest else "head")
    elif cmd == "downgrade":
        command.downgrade(cfg, rest[0] if rest else "-1")
    elif cmd == "stamp":
        command.stamp(cfg, rest[0] if rest else "head")
    else:
        print(f"Comando desconhecido: {cmd}\n{__doc__}")


if __name__ == "__main__":
    main()
