import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Get the project root directory (parent of backend folder)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# Prefer env var; default to SQLite in private folder (not tracked by Git)
# Use absolute path to ensure it's always in the project folder
db_path = os.getenv("DATABASE_URL")
if not db_path:
    # Create absolute path to database in project's private folder
    db_file = PROJECT_ROOT / "private" / "databases" / "workbench.db"
    # Ensure directory exists
    db_file.parent.mkdir(parents=True, exist_ok=True)
    # Use absolute path with forward slashes for SQLite
    db_path = f"sqlite:///{db_file.as_posix()}"

DATABASE_URL = db_path

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
