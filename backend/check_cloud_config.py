"""
Diagnostic script to check cloud configuration for database and email.
Run this to verify your cloud deployment is properly configured.
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def check_environment():
    """Check all required environment variables."""
    print("=" * 80)
    print("CLOUD CONFIGURATION CHECK")
    print("=" * 80)
    print()
    
    errors = []
    warnings = []
    
    # Database configuration
    print("DATABASE CONFIGURATION:")
    print("-" * 80)
    
    cloud_sql_conn = os.getenv("CLOUD_SQL_CONNECTION_NAME")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD")
    db_name = os.getenv("DB_NAME", "uw_workbench")
    environment = os.getenv("ENVIRONMENT", "development").lower()
    database_url = os.getenv("DATABASE_URL")
    
    print(f"  ENVIRONMENT: {environment}")
    print(f"  CLOUD_SQL_CONNECTION_NAME: {'[SET]' if cloud_sql_conn else '[NOT SET]'}")
    if cloud_sql_conn:
        print(f"    Value: {cloud_sql_conn}")
    
    print(f"  DB_USER: {db_user}")
    print(f"  DB_PASSWORD: {'[SET]' if db_password else '[NOT SET]'}")
    print(f"  DB_NAME: {db_name}")
    print(f"  DATABASE_URL: {'[SET - overrides Cloud SQL]' if database_url else 'Not set (using Cloud SQL config)'}")
    
    # Validate database config
    if environment == "production":
        if not cloud_sql_conn and not database_url:
            errors.append("In production, must have either CLOUD_SQL_CONNECTION_NAME or DATABASE_URL set")
        if not db_password:
            errors.append("DB_PASSWORD must be set in production")
        if cloud_sql_conn:
            # Check format: PROJECT:REGION:INSTANCE
            parts = cloud_sql_conn.split(":")
            if len(parts) != 3:
                errors.append(f"CLOUD_SQL_CONNECTION_NAME format should be PROJECT:REGION:INSTANCE, got: {cloud_sql_conn}")
    
    print()
    
    # Email configuration
    print("EMAIL (SMTP) CONFIGURATION:")
    print("-" * 80)
    
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", "")
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "UW Workbench")
    frontend_url = os.getenv("FRONTEND_URL", "")
    
    print(f"  SMTP_HOST: {smtp_host}")
    print(f"  SMTP_PORT: {smtp_port}")
    print(f"  SMTP_USER: {'[SET]' if smtp_user else '[NOT SET]'}")
    print(f"  SMTP_PASSWORD: {'[SET]' if smtp_password else '[NOT SET]'}")
    print(f"  SMTP_FROM_EMAIL: {smtp_from_email if smtp_from_email else '(using SMTP_USER)'}")
    print(f"  SMTP_FROM_NAME: {smtp_from_name}")
    print(f"  FRONTEND_URL: {frontend_url if frontend_url else '[NOT SET]'}")
    
    # Validate email config
    if not smtp_user or not smtp_password:
        warnings.append("Email sending is disabled - SMTP_USER or SMTP_PASSWORD not set")
    
    print()
    
    # Try database connection
    print("DATABASE CONNECTION TEST:")
    print("-" * 80)
    try:
        from backend.database import engine, DATABASE_URL
        print(f"  Database URL configured: {DATABASE_URL[:50]}..." if len(DATABASE_URL) > 50 else f"  Database URL: {DATABASE_URL}")
        
        # Try to connect
        conn = engine.connect()
        conn.close()
        print("  [OK] Database connection: SUCCESS")
        
        # Test query
        from backend.database import SessionLocal
        from backend import models
        db = SessionLocal()
        try:
            user_count = db.query(models.User).count()
            emp_count = db.query(models.Employee).count()
            print(f"  [OK] Database query test: SUCCESS")
            print(f"    - Users in database: {user_count}")
            print(f"    - Employees in database: {emp_count}")
        except Exception as e:
            warnings.append(f"Database query failed: {e}")
        finally:
            db.close()
            
    except Exception as e:
        errors.append(f"Database connection failed: {e}")
        print(f"  [ERROR] Database connection: FAILED - {e}")
    
    print()
    
    # Try email connection (DNS check)
    print("EMAIL CONNECTION TEST (DNS):")
    print("-" * 80)
    if smtp_user and smtp_password:
        try:
            import socket
            socket.gethostbyname(smtp_host)
            print(f"  [OK] DNS resolution for {smtp_host}: SUCCESS")
        except Exception as e:
            warnings.append(f"Cannot resolve SMTP host {smtp_host}: {e}")
            print(f"  [ERROR] DNS resolution for {smtp_host}: FAILED - {e}")
    else:
        print("  [SKIP] Skipped (SMTP not configured)")
    
    print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    if errors:
        print(f"\n[ERRORS] ({len(errors)}):")
        for i, error in enumerate(errors, 1):
            print(f"  {i}. {error}")
    
    if warnings:
        print(f"\n[WARNINGS] ({len(warnings)}):")
        for i, warning in enumerate(warnings, 1):
            print(f"  {i}. {warning}")
    
    if not errors and not warnings:
        print("\n[OK] All checks passed! Configuration looks good.")
    
    print()
    
    # Recommendations
    if environment == "production":
        print("PRODUCTION CHECKLIST:")
        print("-" * 80)
        print("  [ ] Cloud SQL instance is running")
        print("  [ ] Cloud Run service has Cloud SQL connection configured")
        print("  [ ] All secrets are stored in Secret Manager")
        print("  [ ] Cloud Run service uses --set-secrets flag for sensitive data")
        print("  [ ] CORS_ORIGINS includes your production frontend URL")
        print("  [ ] ENVIRONMENT=production is set")
        print()
    
    return len(errors) == 0

if __name__ == "__main__":
    success = check_environment()
    sys.exit(0 if success else 1)

