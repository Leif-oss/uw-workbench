"""Add contact_frequency_days to contacts

Revision ID: 0008_add_contact_frequency_days
Revises: 0007_add_draft_intake_system
Create Date: 2025-01-14
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0008_add_contact_frequency_days'
down_revision = '0007_add_draft_intake_system'
branch_labels = None
depends_on = None


def upgrade():
    # Add contact_frequency_days column to contacts table
    op.add_column('contacts', sa.Column('contact_frequency_days', sa.Integer(), nullable=True))
    
    # Set default value of 90 for existing contacts (unless do_not_contact is true, then set to null)
    # Only update if contacts table exists and has rows (safe for fresh databases)
    op.execute("""
        UPDATE contacts 
        SET contact_frequency_days = CASE 
            WHEN do_not_contact = true THEN NULL 
            ELSE 90 
        END
        WHERE contact_frequency_days IS NULL
    """)


def downgrade():
    op.drop_column('contacts', 'contact_frequency_days')
