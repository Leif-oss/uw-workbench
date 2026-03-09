import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging
from pathlib import Path
from dotenv import load_dotenv

# Initialize logger early (before load_dotenv logging)
logger = logging.getLogger("uvicorn.error")

# Load .env file FIRST before reading any environment variables
# This ensures local development settings are loaded
# For local development, we want to override system env vars with .env
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    # Override=True ensures .env takes precedence over system env vars
    load_dotenv(dotenv_path=env_path, override=True)
    logger.info(f"Loaded .env from: {env_path}")
else:
    # Also try loading from parent directory
    parent_env = Path(__file__).parent.parent / '.env'
    if parent_env.exists():
        load_dotenv(dotenv_path=parent_env, override=True)
        logger.info(f"Loaded .env from: {parent_env}")
    else:
        # Fallback: try loading from current directory
        load_dotenv(override=True)

# PostgreSQL is required - no SQLite fallback
# This ensures consistent behavior between development and production

# Database configuration - LOCAL DEVELOPMENT FIRST
# For local development, always use DATABASE_URL from .env
# Cloud SQL is only used in production when explicitly configured

# Check for explicit DATABASE_URL first (local development or explicit config)
explicit_database_url = os.getenv("DATABASE_URL")

# Log what we found for debugging
if explicit_database_url:
    logger.info(f"DATABASE_URL found: {explicit_database_url[:50]}..." if len(explicit_database_url) > 50 else f"DATABASE_URL: {explicit_database_url}")
else:
    logger.warning("DATABASE_URL not found in environment variables")

# Determine if we're in local development mode
# Local development = DATABASE_URL contains localhost or 127.0.0.1
is_local_development = explicit_database_url and ("localhost" in explicit_database_url.lower() or "127.0.0.1" in explicit_database_url.lower())

if is_local_development:
    logger.info("Detected local development mode - using local PostgreSQL")

# Determine database URL - PostgreSQL only
DATABASE_URL = None
connect_args = {}

if explicit_database_url:
    # Use explicit DATABASE_URL (local development or custom config)
    DATABASE_URL = explicit_database_url
    logger.info(f"Using DATABASE_URL from environment: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'configured'}")
    # Verify it's PostgreSQL (SQLite was removed)
    if "sqlite" in DATABASE_URL.lower():
        raise RuntimeError(
            "SQLite is not supported. Please use PostgreSQL. "
            "For local development, use Docker Compose: docker-compose up -d"
        )
    connect_args = {}
elif not is_local_development:
    logger.info("No explicit DATABASE_URL found, checking for Cloud SQL configuration...")
    # Only check for Cloud SQL if NOT in local development
    # This is for production deployments on Cloud Run
    cloud_sql_connection_name = os.getenv("CLOUD_SQL_CONNECTION_NAME")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "").strip() if os.getenv("DB_PASSWORD") else None
    db_name = os.getenv("DB_NAME", "uw_workbench")
    
    if cloud_sql_connection_name and db_password:
        # Cloud SQL connection (production only)
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(str(db_password))
        encoded_user = urllib.parse.quote_plus(str(db_user))
        DATABASE_URL = f"postgresql+psycopg2://{encoded_user}:{encoded_password}@/{db_name}?host=/cloudsql/{cloud_sql_connection_name}"
        connect_args = {}
    else:
        # No database URL configured - fail fast with helpful error
        raise RuntimeError(
            "DATABASE_URL environment variable is required. "
            "For local development:\n"
            "  1. Start PostgreSQL: docker-compose up -d\n"
            "  2. Set DATABASE_URL in backend/.env: postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench\n"
            "For production, set DATABASE_URL or configure Cloud SQL connection."
        )
else:
    # No database URL configured - fail fast with helpful error
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "For local development:\n"
        "  1. Start PostgreSQL: docker-compose up -d\n"
        "  2. Set DATABASE_URL in backend/.env: postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench\n"
    )

# Create engine with PostgreSQL-specific settings
try:
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
        future=True,
        echo=False,
        pool_pre_ping=True,  # Verify connections before using them
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_size=10,  # Connection pool size
        max_overflow=20,  # Max overflow connections
    )
    
    # Test connection
    test_conn = engine.connect()
    test_conn.close()
    
    # Log connection info
    if is_local_development:
        logger.info("Successfully connected to local PostgreSQL database")
    elif "/cloudsql/" in DATABASE_URL:
        logger.info("Successfully connected to Cloud SQL PostgreSQL")
    else:
        logger.info("Successfully connected to PostgreSQL database")
        
except Exception as e:
    logger.error(f"CRITICAL: Database connection failed: {e}")
    logger.error("Please check:")
    if is_local_development:
        logger.error("  1. DATABASE_URL in backend/.env points to localhost")
        logger.error("  2. PostgreSQL is running: docker-compose up -d")
        logger.error("  3. Connection string format: postgresql://uw_workbench:dev_password_change_me@localhost:5432/uw_workbench")
        logger.error("  4. No Cloud SQL variables should be set in .env for local development")
    elif "/cloudsql/" in DATABASE_URL:
        logger.error("  1. CLOUD_SQL_CONNECTION_NAME environment variable")
        logger.error("  2. DB_USER and DB_PASSWORD environment variables")
        logger.error("  3. Cloud SQL instance is running and accessible")
        logger.error("  4. Cloud Run service has Cloud SQL connection configured")
    else:
        logger.error("  1. DATABASE_URL environment variable is set correctly")
        logger.error("  2. PostgreSQL server is running")
        logger.error("  3. Connection string format: postgresql://user:password@host:port/dbname")
    raise RuntimeError(
        f"Database connection failed: {e}. "
        "PostgreSQL is required. SQLite is not supported."
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
