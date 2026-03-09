"""
Script to run Alembic migrations on Cloud SQL.
This can be run as part of the deployment process.
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from alembic import command
from alembic.config import Config
from backend.database import DATABASE_URL

def run_migrations():
    """Run Alembic migrations."""
    alembic_cfg = Config(str(project_root / "backend" / "alembic.ini"))
    
    # Override with actual database URL
    alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
    
    print(f"Running migrations against: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")
    
    try:
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations completed successfully!")
    except Exception as e:
        print(f"⚠️  Migration failed (this is okay if database is not configured yet): {e}")
        # Don't exit - let the server start anyway, it will create tables if needed
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_migrations()

