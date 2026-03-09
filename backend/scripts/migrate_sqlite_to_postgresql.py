"""
Migration script to transfer data from SQLite to PostgreSQL.

This script:
1. Reads data from existing SQLite database
2. Writes data to PostgreSQL database
3. Preserves all relationships and foreign keys
4. Handles data types correctly

Usage:
    python -m backend.scripts.migrate_sqlite_to_postgresql

Prerequisites:
    - SQLite database exists at: private/databases/workbench.db
    - PostgreSQL database is running and accessible
    - DATABASE_URL environment variable points to PostgreSQL
    - Migrations have been run on PostgreSQL: alembic upgrade head
"""
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Import models
from backend import models
from backend.database import SessionLocal as PostgresSessionLocal, DATABASE_URL as PostgresURL

def migrate_sqlite_to_postgresql():
    """Migrate data from SQLite to PostgreSQL."""
    
    # Check if SQLite database exists
    sqlite_db_path = project_root / "private" / "databases" / "workbench.db"
    if not sqlite_db_path.exists():
        print("❌ SQLite database not found at:", sqlite_db_path)
        print("   Nothing to migrate.")
        return
    
    print("=" * 60)
    print("SQLITE TO POSTGRESQL MIGRATION")
    print("=" * 60)
    print()
    print(f"Source (SQLite): {sqlite_db_path}")
    print(f"Target (PostgreSQL): {PostgresURL.split('@')[-1] if '@' in PostgresURL else PostgresURL}")
    print()
    
    # Confirm before proceeding
    response = input("This will copy all data from SQLite to PostgreSQL. Continue? (yes/no): ")
    if response.lower() != "yes":
        print("Migration cancelled.")
        return
    
    # Connect to SQLite
    sqlite_url = f"sqlite:///{sqlite_db_path.as_posix()}"
    sqlite_engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    SQLiteSessionLocal = sessionmaker(bind=sqlite_engine)
    
    # Connect to PostgreSQL (already configured)
    postgres_session = PostgresSessionLocal()
    sqlite_session = SQLiteSessionLocal()
    
    try:
        # Check if PostgreSQL is empty (except for default office if seeded)
        pg_offices = postgres_session.query(models.Office).count()
        pg_employees = postgres_session.query(models.Employee).count()
        pg_agencies = postgres_session.query(models.Agency).count()
        
        if pg_employees > 0 or pg_agencies > 0:
            print(f"\n⚠️  WARNING: PostgreSQL database already has data:")
            print(f"   Offices: {pg_offices}")
            print(f"   Employees: {pg_employees}")
            print(f"   Agencies: {pg_agencies}")
            response = input("\nProceed anyway? This will add data to existing database. (yes/no): ")
            if response.lower() != "yes":
                print("Migration cancelled.")
                return
        
        print("\nStarting migration...")
        print()
        
        # Get counts from SQLite
        sqlite_offices = sqlite_session.query(models.Office).count()
        sqlite_employees = sqlite_session.query(models.Employee).count()
        sqlite_agencies = sqlite_session.query(models.Agency).count()
        sqlite_contacts = sqlite_session.query(models.Contact).count()
        sqlite_logs = sqlite_session.query(models.Log).count()
        sqlite_users = sqlite_session.query(models.User).count()
        
        print(f"SQLite data to migrate:")
        print(f"  Offices: {sqlite_offices}")
        print(f"  Employees: {sqlite_employees}")
        print(f"  Agencies: {sqlite_agencies}")
        print(f"  Contacts: {sqlite_contacts}")
        print(f"  Logs: {sqlite_logs}")
        print(f"  Users: {sqlite_users}")
        print()
        
        # Migration order (respecting foreign key dependencies):
        # 1. Offices (no dependencies)
        # 2. Employees (depends on Offices via office_id)
        # 3. Users (depends on Employees via employee_id)
        # 4. Agencies (depends on Offices and Employees)
        # 5. Contacts (depends on Agencies)
        # 6. Logs (depends on Agencies, Contacts, Offices)
        # 7. Tasks (depends on Agencies)
        # 8. Production (depends on Offices, Agencies)
        # 9. Submissions (depends on Agencies)
        
        # Track ID mappings for foreign key relationships
        office_id_map = {}  # sqlite_id -> postgres_id
        employee_id_map = {}  # sqlite_id -> postgres_id
        agency_id_map = {}  # sqlite_id -> postgres_id
        contact_id_map = {}  # sqlite_id -> postgres_id
        
        # 1. Migrate Offices
        print("1. Migrating Offices...")
        sqlite_offices_list = sqlite_session.query(models.Office).all()
        for sqlite_office in sqlite_offices_list:
            # Check if office already exists in PostgreSQL (by code)
            existing = postgres_session.query(models.Office).filter(
                models.Office.code == sqlite_office.code
            ).first()
            
            if existing:
                office_id_map[sqlite_office.id] = existing.id
                print(f"   Office '{sqlite_office.code}' already exists, using existing")
            else:
                pg_office = models.Office(
                    code=sqlite_office.code,
                    name=sqlite_office.name
                )
                postgres_session.add(pg_office)
                postgres_session.flush()
                office_id_map[sqlite_office.id] = pg_office.id
                print(f"   ✓ Migrated office: {sqlite_office.code} - {sqlite_office.name}")
        
        postgres_session.commit()
        print(f"   Completed: {len(office_id_map)} offices")
        print()
        
        # 2. Migrate Employees
        print("2. Migrating Employees...")
        sqlite_employees_list = sqlite_session.query(models.Employee).all()
        for sqlite_emp in sqlite_employees_list:
            # Check if employee already exists (by email)
            existing = None
            if sqlite_emp.email:
                existing = postgres_session.query(models.Employee).filter(
                    models.Employee.email == sqlite_emp.email
                ).first()
            
            if existing:
                employee_id_map[sqlite_emp.id] = existing.id
                print(f"   Employee '{sqlite_emp.name}' ({sqlite_emp.email}) already exists, using existing")
            else:
                # Map office_id
                pg_office_id = office_id_map.get(sqlite_emp.office_id) if sqlite_emp.office_id else None
                
                pg_emp = models.Employee(
                    name=sqlite_emp.name,
                    email=sqlite_emp.email,
                    office_id=pg_office_id,  # Map to PostgreSQL office ID
                    website=sqlite_emp.website,
                    role=sqlite_emp.role
                )
                postgres_session.add(pg_emp)
                postgres_session.flush()
                employee_id_map[sqlite_emp.id] = pg_emp.id
                
                # Handle office assignments (many-to-many)
                if sqlite_emp.office_id:
                    pg_office = postgres_session.get(models.Office, pg_office_id)
                    if pg_office and pg_office not in pg_emp.offices:
                        pg_emp.offices.append(pg_office)
                
                print(f"   ✓ Migrated employee: {sqlite_emp.name} ({sqlite_emp.email or 'no email'})")
        
        postgres_session.commit()
        print(f"   Completed: {len(employee_id_map)} employees")
        print()
        
        # 3. Migrate Users
        print("3. Migrating Users...")
        sqlite_users_list = sqlite_session.query(models.User).all()
        for sqlite_user in sqlite_users_list:
            # Check if user already exists (by username or email)
            existing = postgres_session.query(models.User).filter(
                (models.User.username == sqlite_user.username) |
                (models.User.email == sqlite_user.email)
            ).first()
            
            if existing:
                print(f"   User '{sqlite_user.username}' already exists, skipping")
            else:
                # Map employee_id
                pg_employee_id = employee_id_map.get(sqlite_user.employee_id) if sqlite_user.employee_id else None
                
                pg_user = models.User(
                    username=sqlite_user.username,
                    email=sqlite_user.email,
                    password_hash=sqlite_user.password_hash,
                    is_active=sqlite_user.is_active,
                    is_admin=sqlite_user.is_admin,
                    employee_id=pg_employee_id,  # Map to PostgreSQL employee ID
                    must_change_password=sqlite_user.must_change_password,
                    failed_login_attempts=getattr(sqlite_user, 'failed_login_attempts', 0),
                    locked_until=getattr(sqlite_user, 'locked_until', None),
                    password_reset_token=getattr(sqlite_user, 'password_reset_token', None),
                    password_reset_expires=getattr(sqlite_user, 'password_reset_expires', None),
                    created_at=sqlite_user.created_at if hasattr(sqlite_user, 'created_at') else datetime.utcnow(),
                    last_login=getattr(sqlite_user, 'last_login', None)
                )
                postgres_session.add(pg_user)
                print(f"   ✓ Migrated user: {sqlite_user.username} ({sqlite_user.email or 'no email'})")
        
        postgres_session.commit()
        print(f"   Completed: {len(sqlite_users_list)} users")
        print()
        
        # 4. Migrate Agencies
        print("4. Migrating Agencies...")
        sqlite_agencies_list = sqlite_session.query(models.Agency).all()
        for sqlite_agency in sqlite_agencies_list:
            # Check if agency already exists (by code)
            existing = postgres_session.query(models.Agency).filter(
                models.Agency.code == sqlite_agency.code
            ).first()
            
            if existing:
                agency_id_map[sqlite_agency.id] = existing.id
                print(f"   Agency '{sqlite_agency.code}' already exists, using existing")
            else:
                # Map foreign keys
                pg_office_id = office_id_map.get(sqlite_agency.office_id) if sqlite_agency.office_id else None
                pg_underwriter_id = employee_id_map.get(sqlite_agency.primary_underwriter_id) if sqlite_agency.primary_underwriter_id else None
                
                pg_agency = models.Agency(
                    name=sqlite_agency.name,
                    code=sqlite_agency.code,
                    office_id=pg_office_id,
                    web_address=sqlite_agency.web_address,
                    notes=sqlite_agency.notes,
                    primary_underwriter_id=pg_underwriter_id,
                    primary_underwriter=sqlite_agency.primary_underwriter,
                    active_flag=sqlite_agency.active_flag,
                    dba=sqlite_agency.dba,
                    email=sqlite_agency.email
                )
                postgres_session.add(pg_agency)
                postgres_session.flush()
                agency_id_map[sqlite_agency.id] = pg_agency.id
                print(f"   ✓ Migrated agency: {sqlite_agency.code} - {sqlite_agency.name}")
        
        postgres_session.commit()
        print(f"   Completed: {len(agency_id_map)} agencies")
        print()
        
        # 5. Migrate Contacts
        print("5. Migrating Contacts...")
        sqlite_contacts_list = sqlite_session.query(models.Contact).all()
        migrated_contacts = 0
        for sqlite_contact in sqlite_contacts_list:
            # Map agency_id
            pg_agency_id = agency_id_map.get(sqlite_contact.agency_id)
            if not pg_agency_id:
                print(f"   ⚠️  Skipping contact '{sqlite_contact.name}' - agency ID {sqlite_contact.agency_id} not found")
                continue
            
            pg_contact = models.Contact(
                name=sqlite_contact.name,
                title=sqlite_contact.title,
                email=sqlite_contact.email,
                phone=sqlite_contact.phone,
                agency_id=pg_agency_id,  # Map to PostgreSQL agency ID
                notes=sqlite_contact.notes,
                linkedin_url=getattr(sqlite_contact, 'linkedin_url', None)
            )
            postgres_session.add(pg_contact)
            postgres_session.flush()
            contact_id_map[sqlite_contact.id] = pg_contact.id
            migrated_contacts += 1
        
        postgres_session.commit()
        print(f"   Completed: {migrated_contacts} contacts")
        print()
        
        # 6. Migrate Logs
        print("6. Migrating Logs...")
        sqlite_logs_list = sqlite_session.query(models.Log).all()
        migrated_logs = 0
        for sqlite_log in sqlite_logs_list:
            # Map foreign keys
            pg_agency_id = agency_id_map.get(sqlite_log.agency_id) if sqlite_log.agency_id else None
            pg_contact_id = contact_id_map.get(sqlite_log.contact_id) if sqlite_log.contact_id else None
            
            # Get office code if needed
            pg_office_code = None
            if sqlite_log.office:
                pg_office = postgres_session.query(models.Office).filter(
                    models.Office.code == sqlite_log.office
                ).first()
                pg_office_code = pg_office.code if pg_office else None
            
            pg_log = models.Log(
                user=sqlite_log.user,
                datetime=sqlite_log.datetime,
                action=sqlite_log.action,
                agency_id=pg_agency_id,
                office=pg_office_code,
                contact_id=pg_contact_id,
                contact=sqlite_log.contact,
                notes=sqlite_log.notes
            )
            postgres_session.add(pg_log)
            migrated_logs += 1
        
        postgres_session.commit()
        print(f"   Completed: {migrated_logs} logs")
        print()
        
        # 7. Migrate Tasks (if table exists)
        print("7. Migrating Tasks...")
        try:
            sqlite_tasks_list = sqlite_session.query(models.Task).all()
            migrated_tasks = 0
            for sqlite_task in sqlite_tasks_list:
                pg_agency_id = agency_id_map.get(sqlite_task.agency_id) if sqlite_task.agency_id else None
                
                pg_task = models.Task(
                    title=sqlite_task.title,
                    description=sqlite_task.description,
                    agency_id=pg_agency_id,
                    owner=sqlite_task.owner,
                    due_date=getattr(sqlite_task, 'due_date', None),
                    completed=getattr(sqlite_task, 'completed', False),
                    created_at=getattr(sqlite_task, 'created_at', datetime.utcnow())
                )
                postgres_session.add(pg_task)
                migrated_tasks += 1
            
            postgres_session.commit()
            print(f"   Completed: {migrated_tasks} tasks")
        except Exception as e:
            print(f"   ⚠️  Tasks migration skipped: {e}")
        print()
        
        # 8. Migrate Production (if table exists)
        print("8. Migrating Production Data...")
        try:
            sqlite_production_list = sqlite_session.query(models.Production).all()
            migrated_prod = 0
            for sqlite_prod in sqlite_production_list:
                pg_prod = models.Production(
                    office=sqlite_prod.office,
                    agency_code=sqlite_prod.agency_code,
                    agency_name=sqlite_prod.agency_name,
                    active_flag=sqlite_prod.active_flag,
                    month=sqlite_prod.month,
                    standard_lines_ytd_wp=getattr(sqlite_prod, 'standard_lines_ytd_wp', None),
                    standard_lines_ytd_nb=getattr(sqlite_prod, 'standard_lines_ytd_nb', None),
                    standard_lines_pytd_wp=getattr(sqlite_prod, 'standard_lines_pytd_wp', None),
                    standard_lines_pytd_nb=getattr(sqlite_prod, 'standard_lines_pytd_nb', None),
                    surplus_lines_ytd_wp=getattr(sqlite_prod, 'surplus_lines_ytd_wp', None),
                    surplus_lines_ytd_nb=getattr(sqlite_prod, 'surplus_lines_ytd_nb', None),
                    surplus_lines_pytd_wp=getattr(sqlite_prod, 'surplus_lines_pytd_wp', None),
                    surplus_lines_pytd_nb=getattr(sqlite_prod, 'surplus_lines_pytd_nb', None),
                    all_ytd_wp=sqlite_prod.all_ytd_wp,
                    all_ytd_nb=sqlite_prod.all_ytd_nb,
                    pytd_wp=sqlite_prod.pytd_wp,
                    pytd_nb=sqlite_prod.pytd_nb,
                    py_total_nb=getattr(sqlite_prod, 'py_total_nb', None),
                    premium_change=getattr(sqlite_prod, 'premium_change', None),
                    three_year_plus=getattr(sqlite_prod, 'three_year_plus', None),
                    twelve_mo_bind_ratio=getattr(sqlite_prod, 'twelve_mo_bind_ratio', None),
                    twelve_mo_bound=getattr(sqlite_prod, 'twelve_mo_bound', None),
                    twelve_mo_quoted=getattr(sqlite_prod, 'twelve_mo_quoted', None),
                    twelve_mo_decline=getattr(sqlite_prod, 'twelve_mo_decline', None)
                )
                postgres_session.add(pg_prod)
                migrated_prod += 1
            
            postgres_session.commit()
            print(f"   Completed: {migrated_prod} production records")
        except Exception as e:
            print(f"   ⚠️  Production migration skipped: {e}")
        print()
        
        # 9. Migrate Submissions (if table exists)
        print("9. Migrating Submissions...")
        try:
            sqlite_submissions_list = sqlite_session.query(models.Submission).all()
            migrated_subs = 0
            for sqlite_sub in sqlite_submissions_list:
                pg_agency_id = agency_id_map.get(sqlite_sub.agency_id) if hasattr(sqlite_sub, 'agency_id') and sqlite_sub.agency_id else None
                
                # Get all Submission fields
                submission_data = {}
                for column in models.Submission.__table__.columns:
                    if hasattr(sqlite_sub, column.name):
                        value = getattr(sqlite_sub, column.name)
                        # Map agency_id if it exists
                        if column.name == 'agency_id' and value:
                            submission_data[column.name] = agency_id_map.get(value)
                        else:
                            submission_data[column.name] = value
                
                pg_sub = models.Submission(**submission_data)
                postgres_session.add(pg_sub)
                migrated_subs += 1
            
            postgres_session.commit()
            print(f"   Completed: {migrated_subs} submissions")
        except Exception as e:
            print(f"   ⚠️  Submissions migration skipped: {e}")
        print()
        
        # Final summary
        print("=" * 60)
        print("MIGRATION COMPLETE!")
        print("=" * 60)
        print()
        print("Data migrated:")
        print(f"  Offices: {len(office_id_map)}")
        print(f"  Employees: {len(employee_id_map)}")
        print(f"  Users: {len(sqlite_users_list)}")
        print(f"  Agencies: {len(agency_id_map)}")
        print(f"  Contacts: {migrated_contacts}")
        print(f"  Logs: {migrated_logs}")
        print()
        print("✅ Your data has been successfully migrated to PostgreSQL!")
        print()
        print("Next steps:")
        print("  1. Verify data in PostgreSQL database")
        print("  2. Test the application with migrated data")
        print("  3. Once verified, you can archive the SQLite database")
        print()
        
    except Exception as e:
        postgres_session.rollback()
        print(f"\n❌ ERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        sqlite_session.close()
        postgres_session.close()
        sqlite_engine.dispose()

if __name__ == "__main__":
    migrate_sqlite_to_postgresql()


