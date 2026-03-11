"""Add last_contact_date to new_business table

Revision ID: 0013_add_new_business_last_contact_date
Revises: 0012_add_new_business_table
Create Date: 2025-03-10
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0013_add_last_contact_date'
down_revision = '0012_add_new_business_table'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('new_business', sa.Column('last_contact_date', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('new_business', 'last_contact_date')
