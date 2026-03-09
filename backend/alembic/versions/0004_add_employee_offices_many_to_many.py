"""Add employee_offices many-to-many relationship

Revision ID: 0004_add_employee_offices_many_to_many
Revises: 0003_add_user_security_fields
Create Date: 2025-01-XX

This migration:
1. Creates employee_offices junction table for many-to-many relationship
2. Migrates existing office_id data to the new junction table
3. Makes email unique in employees table
4. Removes duplicate password/auth fields from employees (kept in users table)

PostgreSQL-only migration (SQLite not supported).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '0004_employee_offices_m2m'
down_revision = '0003_add_user_security_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Create employee_offices junction table
    op.create_table(
        'employee_offices',
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('office_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['office_id'], ['offices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('employee_id', 'office_id')
    )
    op.create_index('ix_employee_offices_employee_id', 'employee_offices', ['employee_id'])
    op.create_index('ix_employee_offices_office_id', 'employee_offices', ['office_id'])
    
    # Step 2: Migrate existing office_id data to junction table
    # Copy all existing employee-office relationships
    op.execute("""
        INSERT INTO employee_offices (employee_id, office_id)
        SELECT id, office_id
        FROM employees
        WHERE office_id IS NOT NULL
    """)
    
    # Step 3: Make email unique in employees table (to prevent duplicates)
    # First, handle any existing duplicates by keeping the first one and updating others
    # This is a safety measure - ideally there should be no duplicates
    op.execute("""
        UPDATE employees e1
        SET email = NULL
        WHERE EXISTS (
            SELECT 1 FROM employees e2
            WHERE e2.email = e1.email
            AND e2.id < e1.id
            AND e2.email IS NOT NULL
        )
    """)
    
    # Now add unique constraint
    op.create_unique_constraint('uq_employees_email', 'employees', ['email'])
    
    # Step 4: Remove duplicate password/auth fields from employees (PostgreSQL supports DROP COLUMN)
    # These are now only in the users table
    # Check if columns exist before attempting to drop (for migration safety)
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = [col['name'] for col in inspector.get_columns('employees')]
    
    # Drop password/auth columns if they exist (they shouldn't exist in new installs)
    if 'password_hash' in existing_columns:
        op.drop_column('employees', 'password_hash')
    if 'password_reset_token' in existing_columns:
        op.drop_column('employees', 'password_reset_token')
    if 'password_reset_expires' in existing_columns:
        op.drop_column('employees', 'password_reset_expires')
    
    # Note: We keep office_id column for backward compatibility during transition
    # It will be removed in a future migration after all code is updated


def downgrade():
    # Re-add the columns we removed
    op.add_column('employees', sa.Column('password_hash', sa.String(255), nullable=True))
    op.add_column('employees', sa.Column('password_reset_token', sa.String(255), nullable=True))
    op.add_column('employees', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))
    
    # Remove unique constraint on email
    op.drop_constraint('uq_employees_email', 'employees', type_='unique')
    
    # Drop the junction table
    op.drop_index('ix_employee_offices_office_id', table_name='employee_offices')
    op.drop_index('ix_employee_offices_employee_id', table_name='employee_offices')
    op.drop_table('employee_offices')

