"""Add new business table

Revision ID: 0012_add_new_business_table
Revises: 0011_add_contact_details_fields
Create Date: 2025-03-10
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0012_add_new_business_table'
down_revision = '0011_add_contact_details_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'new_business',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contact_email', sa.String(length=255), nullable=False),
        sa.Column('policy_number', sa.String(length=100), nullable=False),
        sa.Column('product', sa.String(length=255), nullable=False),
        sa.Column('effective_date', sa.DateTime(), nullable=False),
        sa.Column('frequency_days', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_employee_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['created_by_employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_new_business_id'), 'new_business', ['id'], unique=False)
    op.create_index(op.f('ix_new_business_effective_date'), 'new_business', ['effective_date'], unique=False)
    op.create_index(op.f('ix_new_business_created_by_employee_id'), 'new_business', ['created_by_employee_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_new_business_created_by_employee_id'), table_name='new_business')
    op.drop_index(op.f('ix_new_business_effective_date'), table_name='new_business')
    op.drop_index(op.f('ix_new_business_id'), table_name='new_business')
    op.drop_table('new_business')
