"""Add contact_id to logs

Revision ID: 0002_add_contact_id_to_logs
Revises: 0001_init
Create Date: 2025-12-08
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_add_contact_id_to_logs"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("logs")}
    if "contact_id" not in columns:
        op.add_column(
            "logs",
            sa.Column(
                "contact_id",
                sa.Integer,
                nullable=True,
            ),
        )


def downgrade():
    op.drop_column("logs", "contact_id")
