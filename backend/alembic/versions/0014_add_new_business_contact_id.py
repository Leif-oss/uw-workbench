"""Add contact_id to new_business table

Revision ID: 0014_add_contact_id
Revises: 0013_add_last_contact_date
Create Date: 2025-03-10
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0014_add_contact_id'
down_revision = '0013_add_last_contact_date'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('new_business', sa.Column('contact_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_new_business_contact_id'), 'new_business', ['contact_id'], unique=False)
    op.create_foreign_key('fk_new_business_contact_id', 'new_business', 'contacts', ['contact_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint('fk_new_business_contact_id', 'new_business', type_='foreignkey')
    op.drop_index(op.f('ix_new_business_contact_id'), table_name='new_business')
    op.drop_column('new_business', 'contact_id')
