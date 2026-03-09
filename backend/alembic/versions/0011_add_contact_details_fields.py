"""Add contact details fields

Revision ID: 0011_add_contact_details_fields
Revises: 0010_add_renewals_table
Create Date: 2025-02-23
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0011_add_contact_details_fields'
down_revision = '0010_add_renewals_table'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('contacts', sa.Column('previous_agencies', sa.Text(), nullable=True))
    op.add_column('contacts', sa.Column('likes_hobbies', sa.Text(), nullable=True))
    op.add_column('contacts', sa.Column('additional_info', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('contacts', 'additional_info')
    op.drop_column('contacts', 'likes_hobbies')
    op.drop_column('contacts', 'previous_agencies')
