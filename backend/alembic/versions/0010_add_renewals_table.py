"""Add renewals table

Revision ID: 0010_add_renewals_table
Revises: 0009_add_email_templates_table
Create Date: 2025-02-23
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '0010_add_renewals_table'
down_revision = '0009_add_email_templates_table'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'renewals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('policy_number', sa.String(length=100), nullable=False),
        sa.Column('insured_name', sa.String(length=255), nullable=False),
        sa.Column('expiration_date', sa.DateTime(), nullable=False),
        sa.Column('producer', sa.String(length=255), nullable=True),
        sa.Column('producer_code', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('premium', sa.Float(), nullable=True),
        sa.Column('coverage_type', sa.String(length=255), nullable=True),
        sa.Column('created_by_employee_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['created_by_employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_renewals_id'), 'renewals', ['id'], unique=False)
    op.create_index(op.f('ix_renewals_expiration_date'), 'renewals', ['expiration_date'], unique=False)
    op.create_index(op.f('ix_renewals_created_by_employee_id'), 'renewals', ['created_by_employee_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_renewals_created_by_employee_id'), table_name='renewals')
    op.drop_index(op.f('ix_renewals_expiration_date'), table_name='renewals')
    op.drop_index(op.f('ix_renewals_id'), table_name='renewals')
    op.drop_table('renewals')
