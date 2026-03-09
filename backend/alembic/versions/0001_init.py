"""Initial tables

Revision ID: 0001_init
Revises: 
Create Date: 2025-12-07
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_init'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'offices',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('code', sa.String(length=10), nullable=False, unique=True),
        sa.Column('name', sa.String(length=255), nullable=False),
    )
    op.create_table(
        'employees',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('office_id', sa.Integer, sa.ForeignKey('offices.id', ondelete="SET NULL")),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=True),
    )
    op.create_table(
        'agencies',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False, unique=True),
        sa.Column('office_id', sa.Integer, sa.ForeignKey('offices.id', ondelete="SET NULL")),
        sa.Column('web_address', sa.String(length=255)),
        sa.Column('notes', sa.Text),
        sa.Column('primary_underwriter_id', sa.Integer, sa.ForeignKey('employees.id', ondelete="SET NULL")),
        sa.Column('primary_underwriter', sa.String(length=255)),
        sa.Column('active_flag', sa.String(length=50)),
        sa.Column('dba', sa.String(length=255)),
        sa.Column('email', sa.String(length=255)),
    )
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255)),
        sa.Column('email', sa.String(length=255)),
        sa.Column('phone', sa.String(length=50)),
        sa.Column('agency_id', sa.Integer, sa.ForeignKey('agencies.id', ondelete="CASCADE"), nullable=False),
        sa.Column('notes', sa.Text),
        sa.Column('linkedin_url', sa.String(length=500)),
    )
    op.create_table(
        'logs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user', sa.String(length=255), nullable=False),
        sa.Column('datetime', sa.DateTime, nullable=False),
        sa.Column('action', sa.String(length=255), nullable=False),
        sa.Column('agency_id', sa.Integer, sa.ForeignKey('agencies.id', ondelete="SET NULL")),
        sa.Column('office', sa.String(length=50)),
        sa.Column('notes', sa.Text),
        sa.Column('contact_id', sa.Integer, sa.ForeignKey('contacts.id', ondelete="SET NULL"), nullable=True),
        sa.Column('contact', sa.String(length=255), nullable=True),
    )
    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('username', sa.String(length=100), nullable=False, unique=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )


def downgrade():
    op.drop_table('logs')
    op.drop_table('users')
    op.drop_table('contacts')
    op.drop_table('agencies')
    op.drop_table('employees')
    op.drop_table('offices')
