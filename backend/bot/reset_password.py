# Redefine a senha do admin do dashboard.
# Uso:  python reset_password.py <nova_senha>
# IMPORTANTE: pare o bot antes de rodar (o SQLite trava se estiver em uso).
import os
import sys
import sqlite3

from security import hash_password, encrypt_value

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'crm.db')


def main():
    if len(sys.argv) < 2:
        print('Uso: python reset_password.py <nova_senha>')
        sys.exit(1)

    nova_senha = sys.argv[1]
    if len(nova_senha) < 4:
        print('Erro: a senha precisa ter ao menos 4 caracteres.')
        sys.exit(1)

    if not os.path.exists(DB_PATH):
        print('Erro: crm.db nao encontrado. Suba o bot/backend uma vez para criar o banco.')
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    try:
        # A app cifra valores sensíveis com Fernet usando ENCRYPTION_KEY.
        # Recupera a chave persistida no banco para manter a leitura consistente.
        row = conn.execute("SELECT value FROM admin_config WHERE key='encryption_key'").fetchone()
        if row and row[0]:
            os.environ['ENCRYPTION_KEY'] = row[0]
        else:
            print('AVISO: encryption_key ausente no banco; valor sera salvo sem cifragem Fernet.')

        hashed = hash_password(nova_senha)
        encrypted = encrypt_value(hashed)

        conn.execute(
            "INSERT INTO admin_config(key, value) VALUES('admin_password', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (encrypted,),
        )
        conn.commit()
        print('Senha de admin redefinida com sucesso.')
    finally:
        conn.close()


if __name__ == '__main__':
    main()
