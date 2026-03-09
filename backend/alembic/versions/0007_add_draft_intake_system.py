"""Add draft intake system tables

Revision ID: 0007_add_draft_intake_system
Revises: 0006_add_contact_do_not_contact
Create Date: 2025-01-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0007_add_draft_intake_system'
down_revision = '0006_add_contact_do_not_contact'
branch_labels = None
depends_on = None


def upgrade():
    # Create product_schemas table
    op.create_table(
        'product_schemas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_code', sa.String(length=50), nullable=False),
        sa.Column('version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('schema_definition', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_product_schemas_product_code', 'product_schemas', ['product_code'], unique=True)
    
    # Create draft_submissions table
    op.create_table(
        'draft_submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('product_code', sa.String(length=50), nullable=False),
        sa.Column('product_version', sa.String(length=20), nullable=False, server_default='v1'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='NEW'),
        sa.Column('agency_id', sa.Integer(), nullable=True),
        sa.Column('employee_id', sa.Integer(), nullable=True),
        sa.Column('extracted_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['agency_id'], ['agencies.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_draft_submissions_product_code', 'draft_submissions', ['product_code'], unique=False)
    op.create_index('ix_draft_submissions_status', 'draft_submissions', ['status'], unique=False)
    
    # Create submission_sources table
    op.create_table(
        'submission_sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('draft_id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=500), nullable=True),
        sa.Column('content_type', sa.String(length=100), nullable=True),
        sa.Column('extracted_text', sa.Text(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('file_hash', sa.String(length=64), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('extraction_method', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['draft_id'], ['draft_submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_submission_sources_draft_id', 'submission_sources', ['draft_id'], unique=False)
    op.create_index('ix_submission_sources_file_hash', 'submission_sources', ['file_hash'], unique=False)
    
    # Create extracted_field_values table
    op.create_table(
        'extracted_field_values',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('draft_id', sa.Integer(), nullable=False),
        sa.Column('field_path', sa.String(length=255), nullable=False),
        sa.Column('extracted_value', sa.Text(), nullable=True),
        sa.Column('overridden_value', sa.Text(), nullable=True),
        sa.Column('final_value', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('evidence', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('is_overridden', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['draft_id'], ['draft_submissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_extracted_field_values_draft_id', 'extracted_field_values', ['draft_id'], unique=False)
    op.create_index('ix_extracted_field_values_field_path', 'extracted_field_values', ['field_path'], unique=False)
    
    # Create outbox_messages table
    op.create_table(
        'outbox_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('draft_id', sa.Integer(), nullable=True),
        sa.Column('payload_json', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('submission_status', sa.String(length=50), nullable=True, server_default='pending'),
        sa.Column('submission_response', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['draft_id'], ['draft_submissions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by'], ['employees.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_outbox_messages_draft_id', 'outbox_messages', ['draft_id'], unique=False)


def downgrade():
    op.drop_index('ix_outbox_messages_draft_id', table_name='outbox_messages')
    op.drop_table('outbox_messages')
    op.drop_index('ix_extracted_field_values_field_path', table_name='extracted_field_values')
    op.drop_index('ix_extracted_field_values_draft_id', table_name='extracted_field_values')
    op.drop_table('extracted_field_values')
    op.drop_index('ix_submission_sources_file_hash', table_name='submission_sources')
    op.drop_index('ix_submission_sources_draft_id', table_name='submission_sources')
    op.drop_table('submission_sources')
    op.drop_index('ix_draft_submissions_status', table_name='draft_submissions')
    op.drop_index('ix_draft_submissions_product_code', table_name='draft_submissions')
    op.drop_table('draft_submissions')
    op.drop_index('ix_product_schemas_product_code', table_name='product_schemas')
    op.drop_table('product_schemas')
