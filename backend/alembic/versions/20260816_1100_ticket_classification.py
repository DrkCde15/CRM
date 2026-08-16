"""Adiciona classificacao de tickets + tabelas audit_logs e plugins.

As tabelas ``audit_logs`` e ``plugins`` sao criadas automaticamente pelo
``Base.metadata.create_all`` em main.py; aqui adicionamos apenas as colunas
de classificacao ao Ticket (o SQLite nao altera via create_all).
A migracao e idempotente: nao recria colunas que já existam (ex.: criadas
pelo ALTER de fallback em main.py).

Revision ID: 20260816_1100
Revises: 20260816_1000
Create Date: 2026-08-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260816_1100"
down_revision: Union[str, None] = "20260816_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns("tickets")}

    cols = [
        ("categoria", sa.Column("categoria", sa.String(length=100), nullable=True)),
        ("prioridade", sa.Column("prioridade", sa.String(length=50), nullable=True)),
        ("sentimento", sa.Column("sentimento", sa.String(length=50), nullable=True)),
        ("classified_at", sa.Column("classified_at", sa.DateTime(), nullable=True)),
    ]
    with op.batch_alter_table("tickets") as batch_op:
        for name, col in cols:
            if name not in existing:
                batch_op.add_column(col)


def downgrade() -> None:
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.drop_column("classified_at")
        batch_op.drop_column("sentimento")
        batch_op.drop_column("prioridade")
        batch_op.drop_column("categoria")
