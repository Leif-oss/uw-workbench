"""
Script to create the audit_logs table in the database.
Run this once to add the audit logging table.
"""
from .database import engine
from .models import AuditLog

def create_audit_log_table():
    """Create the audit_logs table if it doesn't exist."""
    try:
        # Create only the audit_logs table
        AuditLog.__table__.create(bind=engine, checkfirst=True)
        print("OK: Audit logs table created successfully (or already exists)")
    except Exception as e:
        print(f"ERROR: Error creating audit logs table: {e}")
        raise

if __name__ == "__main__":
    create_audit_log_table()

