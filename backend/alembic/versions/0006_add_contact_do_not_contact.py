"""Add do_not_contact field to contacts

Revision ID: 0006_add_contact_do_not_contact
Revises: 0005_add_missing_tables
Create Date: 2025-12-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006_add_contact_do_not_contact'
down_revision = '0005_add_missing_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Add do_not_contact column to contacts table
    op.add_column('contacts', sa.Column('do_not_contact', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    # Remove do_not_contact column from contacts table
    op.drop_column('contacts', 'do_not_contact')
