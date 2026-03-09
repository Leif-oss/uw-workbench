"""Add missing tables (production, tasks, submissions, audit_logs)

Revision ID: 0005_add_missing_tables
Revises: 0004_employee_offices_m2m
Create Date: 2025-01-09

PostgreSQL-only migration (SQLite not supported).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0005_add_missing_tables'
down_revision = '0004_employee_offices_m2m'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()
    
    # Create tasks table (if not exists)
    if 'tasks' not in existing_tables:
        op.create_table(
            'tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('owner', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('agency_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('ix_tasks_agency_id', 'tasks', ['agency_id'], unique=False)
    
    # Create production table (if not exists)
    if 'production' not in existing_tables:
        op.create_table(
            'production',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('office', sa.String(length=50), nullable=False),
        sa.Column('agency_code', sa.String(length=50), nullable=False),
        sa.Column('agency_name', sa.String(length=255), nullable=False),
        sa.Column('affiliated_code', sa.String(length=50), nullable=True),
        sa.Column('active_flag', sa.String(length=50), nullable=True),
        sa.Column('month', sa.String(length=7), nullable=False),
        # Standard Lines
        sa.Column('standard_lines_ytd_wp', sa.Integer(), nullable=True),
        sa.Column('standard_lines_ytd_nb', sa.Integer(), nullable=True),
        sa.Column('standard_lines_pytd_wp', sa.Integer(), nullable=True),
        sa.Column('standard_lines_pytd_nb', sa.Integer(), nullable=True),
        # Surplus Lines
        sa.Column('surplus_lines_ytd_wp', sa.Integer(), nullable=True),
        sa.Column('surplus_lines_ytd_nb', sa.Integer(), nullable=True),
        sa.Column('surplus_lines_pytd_wp', sa.Integer(), nullable=True),
        sa.Column('surplus_lines_pytd_nb', sa.Integer(), nullable=True),
        # All Lines
        sa.Column('all_ytd_wp', sa.Integer(), nullable=True),
        sa.Column('all_ytd_nb', sa.Integer(), nullable=True),
        sa.Column('pytd_wp', sa.Integer(), nullable=True),
        sa.Column('pytd_nb', sa.Integer(), nullable=True),
        sa.Column('py_total_nb', sa.Integer(), nullable=True),
        # Additional metrics
        sa.Column('premium_change', sa.Integer(), nullable=True),
        sa.Column('three_year_plus', sa.Integer(), nullable=True),
        sa.Column('twelve_mo_bind_ratio', sa.String(length=20), nullable=True),
        sa.Column('twelve_mo_bound', sa.Integer(), nullable=True),
        sa.Column('twelve_mo_quoted', sa.Integer(), nullable=True),
        sa.Column('twelve_mo_decline', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('ix_production_agency_code', 'production', ['agency_code'], unique=False)
    
    # Create submissions table (if not exists)
    if 'submissions' not in existing_tables:
        op.create_table(
            'submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        # File information
        sa.Column('original_filename', sa.String(length=500), nullable=True),
        sa.Column('file_type', sa.String(length=50), nullable=True),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        # Extracted fields
        sa.Column('effective_date', sa.String(length=50), nullable=True),
        sa.Column('expiration_date', sa.String(length=50), nullable=True),
        sa.Column('producer_name', sa.String(length=255), nullable=True),
        sa.Column('producer_code', sa.String(length=50), nullable=True),
        sa.Column('insured_name', sa.String(length=255), nullable=True),
        sa.Column('additional_insured_names', sa.Text(), nullable=True),
        # Linked CRM entities
        sa.Column('agency_id', sa.Integer(), nullable=True),
        sa.Column('contact_id', sa.Integer(), nullable=True),
        # Contact information
        sa.Column('contact_name', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=50), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        # Mailing address
        sa.Column('mailing_address', sa.Text(), nullable=True),
        # Location address
        sa.Column('location_street_number', sa.String(length=50), nullable=True),
        sa.Column('location_street_name', sa.String(length=255), nullable=True),
        sa.Column('location_suite', sa.String(length=50), nullable=True),
        sa.Column('location_city', sa.String(length=100), nullable=True),
        sa.Column('location_state', sa.String(length=2), nullable=True),
        sa.Column('location_zip', sa.String(length=20), nullable=True),
        # Limits and coverages
        sa.Column('building_limit', sa.String(length=50), nullable=True),
        sa.Column('deductible', sa.String(length=50), nullable=True),
        sa.Column('additional_limits_rents', sa.String(length=50), nullable=True),
        sa.Column('additional_limits_ordinance', sa.String(length=50), nullable=True),
        sa.Column('additional_limits_demolition', sa.String(length=50), nullable=True),
        sa.Column('additional_limits_eqsl', sa.String(length=50), nullable=True),
        sa.Column('additional_insured', sa.Text(), nullable=True),
        sa.Column('mortgagee', sa.Text(), nullable=True),
        sa.Column('loss_payee', sa.Text(), nullable=True),
        # Property details
        sa.Column('construction_type', sa.String(length=100), nullable=True),
        sa.Column('construction_year', sa.String(length=10), nullable=True),
        sa.Column('square_feet', sa.String(length=20), nullable=True),
        sa.Column('sprinkler_percent', sa.String(length=20), nullable=True),
        sa.Column('protection_class', sa.String(length=20), nullable=True),
        # Additional fields
        sa.Column('line_of_business', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        # Status tracking
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('reviewed_by', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('ix_submissions_agency_id', 'submissions', ['agency_id'], unique=False)
        op.create_index('ix_submissions_contact_id', 'submissions', ['contact_id'], unique=False)
    
    # Create audit_logs table (if not exists)
    if 'audit_logs' not in existing_tables:
        op.create_table(
            'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('actor_email', sa.String(length=255), nullable=False),
        sa.Column('actor_employee_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('office_id', sa.Integer(), nullable=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.ForeignKeyConstraint(['actor_employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['office_id'], ['offices.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
        op.create_index('ix_audit_logs_actor_email', 'audit_logs', ['actor_email'], unique=False)
        op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'], unique=False)
        op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'], unique=False)


def downgrade():
    # Drop tables in reverse order
    op.drop_index('ix_audit_logs_entity_type', table_name='audit_logs')
    op.drop_index('ix_audit_logs_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor_email', table_name='audit_logs')
    op.drop_table('audit_logs')
    
    op.drop_index('ix_submissions_contact_id', table_name='submissions')
    op.drop_index('ix_submissions_agency_id', table_name='submissions')
    op.drop_table('submissions')
    
    op.drop_index('ix_production_agency_code', table_name='production')
    op.drop_table('production')
    
    op.drop_index('ix_tasks_agency_id', table_name='tasks')
    op.drop_table('tasks')
