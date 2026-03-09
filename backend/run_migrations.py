#!/usr/bin/env python3
"""
Standalone script to run database migrations.
Can be run from command line or imported.
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir.parent))

from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migrations():
    """Run database migrations to head."""
    try:
        # Find alembic.ini
        alembic_ini_path = backend_dir / "alembic.ini"
        
        if not alembic_ini_path.exists():
            # Try absolute path (Docker)
            alembic_ini_path = Path("/app/backend/alembic.ini")
            if not alembic_ini_path.exists():
                logger.error("alembic.ini not found")
                return False
        
        logger.info(f"Found alembic.ini at: {alembic_ini_path}")
        
        # Configure Alembic
        alembic_cfg = Config(str(alembic_ini_path))
        alembic_scripts_dir = alembic_ini_path.parent / "alembic"
        alembic_cfg.set_main_option("script_location", str(alembic_scripts_dir))
        
        # Get database connection from environment
        from backend.database import DATABASE_URL, engine
        
        logger.info("Connecting to database...")
        # Use a connection with a short timeout to fail fast if DB is unavailable
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            current_rev = context.get_current_revision()
            
            script = ScriptDirectory.from_config(alembic_cfg)
            head_rev = script.get_current_head()
            
            logger.info(f"Current revision: {current_rev or 'None (fresh database)'}")
            logger.info(f"Target revision: {head_rev}")
            
            if current_rev == head_rev:
                logger.info("Database is up to date - no migrations needed")
                return True
            
            logger.info(f"Running migrations: {current_rev or 'None'} -> {head_rev}")
            command.upgrade(alembic_cfg, "head")
            logger.info("Migrations completed successfully")
            return True
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        logger.error("=" * 80)
        logger.error("FULL TRACEBACK:")
        logger.error(traceback.format_exc())
        logger.error("=" * 80)
        # Also print to stderr so it shows up in Cloud Run logs
        import sys
        print(f"ERROR: Migration failed: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
