"""add user security fields

Revision ID: 0003_add_user_security_fields
Revises: 0002_add_sessions_and_user_roles
Create Date: 2024-12-19 18:00:00.000000

PostgreSQL-only migration (SQLite not supported).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '0003_add_user_security_fields'
down_revision = '0002_add_sessions_and_user_roles'
branch_labels = None
depends_on = None


def upgrade():
    # Email column already exists in 0001_init, just add index if needed
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    if 'ix_users_email' not in existing_indexes:
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    
    # Add security fields
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add index to password_reset_token for faster lookups
    # PostgreSQL: Check if index exists before creating
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    if 'ix_users_password_reset_token' not in existing_indexes:
        op.create_index(op.f('ix_users_password_reset_token'), 'users', ['password_reset_token'], unique=False)


def downgrade():
    # Remove indexes
    op.drop_index(op.f('ix_users_password_reset_token'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    
    # Remove columns (email column is in 0001_init, not removed here)
    op.drop_column('users', 'must_change_password')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')


