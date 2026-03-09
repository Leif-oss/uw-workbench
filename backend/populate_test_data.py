"""
Script to populate database with fake test data for testing phase.
Creates:
- Offices
- 5 employees per office
- Agencies (assigned to employees)
- 5 contacts per agency
- Production data for last 12 months
- ~10 agency calls per underwriter per month (logs)
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models, schemas
from backend.crud import create_office, create_employee, create_agency, create_contact

# Tables should exist from Alembic migrations
# Run 'alembic upgrade head' before using this script

# Fake data generators
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
    "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Sanchez",
    "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams"
]

OFFICE_NAMES = [
    ("ALB", "Albuquerque"),
    ("PHX", "Phoenix"),
    ("DEN", "Denver"),
    ("LAX", "Los Angeles"),
    ("SFO", "San Francisco"),
    ("SEA", "Seattle"),
    ("POR", "Portland"),
    ("LAS", "Las Vegas")
]

AGENCY_NAME_PARTS = [
    "Premier", "Global", "Pacific", "Mountain", "Coastal", "Metro", "Elite", "Summit",
    "Apex", "Horizon", "Crest", "Valley", "Ridge", "Bay", "Gate", "Point",
    "Insurance", "Agencies", "Brokerage", "Group", "Partners", "Associates", "Services"
]

CONTACT_TITLES = [
    "President", "Vice President", "CEO", "Owner", "Manager", "Director", "Senior Agent",
    "Account Executive", "Producer", "Agent", "Senior Vice President", "Principal"
]

CITIES = [
    "Albuquerque", "Phoenix", "Denver", "Los Angeles", "San Francisco", "Seattle",
    "Portland", "Las Vegas", "San Diego", "Sacramento", "Tucson", "Salt Lake City"
]

STATES = ["NM", "AZ", "CO", "CA", "WA", "OR", "NV", "UT"]

# Production data ranges (realistic insurance premium numbers in dollars)
MIN_MONTHLY_WP = 50000  # Minimum monthly written premium
MAX_MONTHLY_WP = 500000  # Maximum monthly written premium
MIN_NB = 2  # Minimum new business
MAX_NB = 15  # Maximum new business


def generate_email(first_name: str, last_name: str, domain: str = "example.com") -> str:
    """Generate a fake email address."""
    return f"{first_name.lower()}.{last_name.lower()}@{domain}".replace(" ", "")


def generate_phone() -> str:
    """Generate a fake phone number."""
    area = random.choice(["505", "602", "303", "310", "415", "206", "503", "702"])
    exchange = random.randint(200, 999)
    number = random.randint(1000, 9999)
    return f"({area}) {exchange}-{number}"


def generate_agency_name() -> str:
    """Generate a fake agency name."""
    part1 = random.choice(AGENCY_NAME_PARTS[:12])
    part2 = random.choice(AGENCY_NAME_PARTS[12:])
    if random.random() > 0.7:
        city = random.choice(CITIES)
        return f"{part1} {city} {part2}"
    else:
        return f"{part1} {part2}"


def generate_agency_code() -> str:
    """Generate a fake 6-digit agency code."""
    return f"{random.randint(100000, 999999)}"


def create_production_data(db: Session, office_code: str, agency_code: str, agency_name: str, months: int = 12):
    """Create production data for the last N months."""
    today = datetime.now()
    production_records = []
    
    # Calculate cumulative values as we go through months
    ytd_wp_standard = 0
    ytd_wp_surplus = 0
    ytd_nb_standard = 0
    ytd_nb_surplus = 0
    pytd_wp_standard = 0
    pytd_wp_surplus = 0
    pytd_nb_standard = 0
    pytd_nb_surplus = 0
    
    for i in range(months):
        # Calculate date for this month (going backwards)
        month_date = today.replace(day=1) - timedelta(days=32 * i)
        month_str = month_date.strftime("%Y-%m")
        
        # Generate monthly values with some variance
        monthly_wp_standard = random.randint(MIN_MONTHLY_WP, MAX_MONTHLY_WP)
        monthly_wp_surplus = random.randint(MIN_MONTHLY_WP // 2, MAX_MONTHLY_WP // 2)
        monthly_nb_standard = random.randint(MIN_NB, MAX_NB)
        monthly_nb_surplus = random.randint(MIN_NB // 2, MAX_NB // 2)
        
        # Accumulate YTD
        ytd_wp_standard += monthly_wp_standard
        ytd_wp_surplus += monthly_wp_surplus
        ytd_nb_standard += monthly_nb_standard
        ytd_nb_surplus += monthly_nb_surplus
        
        # For PYTD, simulate last year's data (slightly different)
        pytd_wp_standard = ytd_wp_standard + random.randint(-50000, 50000)
        pytd_wp_surplus = ytd_wp_surplus + random.randint(-25000, 25000)
        pytd_nb_standard = ytd_nb_standard + random.randint(-2, 2)
        pytd_nb_surplus = ytd_nb_surplus + random.randint(-1, 1)
        
        # Calculate all lines totals
        all_ytd_wp = ytd_wp_standard + ytd_wp_surplus
        all_ytd_nb = ytd_nb_standard + ytd_nb_surplus
        pytd_wp = pytd_wp_standard + pytd_wp_surplus
        pytd_nb = pytd_nb_standard + pytd_nb_surplus
        
        # Calculate 12-month metrics
        twelve_mo_bound = random.randint(25, 75)
        twelve_mo_quoted = twelve_mo_bound + random.randint(15, 40)
        twelve_mo_decline = random.randint(5, 20)
        bind_ratio = round((twelve_mo_bound / twelve_mo_quoted) * 100, 1) if twelve_mo_quoted > 0 else 0
        
        production = models.Production(
            office=office_code,
            agency_code=agency_code,
            agency_name=agency_name,
            active_flag=random.choice(["Active", "Inactive", "Pending"]),
            month=month_str,
            # Standard Lines
            standard_lines_ytd_wp=ytd_wp_standard,
            standard_lines_ytd_nb=ytd_nb_standard,
            standard_lines_pytd_wp=pytd_wp_standard,
            standard_lines_pytd_nb=pytd_nb_standard,
            # Surplus Lines
            surplus_lines_ytd_wp=ytd_wp_surplus,
            surplus_lines_ytd_nb=ytd_nb_surplus,
            surplus_lines_pytd_wp=pytd_wp_surplus,
            surplus_lines_pytd_nb=pytd_nb_surplus,
            # All Lines
            all_ytd_wp=all_ytd_wp,
            all_ytd_nb=all_ytd_nb,
            pytd_wp=pytd_wp,
            pytd_nb=pytd_nb,
            py_total_nb=pytd_nb,
            # Additional metrics
            premium_change=all_ytd_wp - pytd_wp,
            three_year_plus=random.randint(10, 30),
            twelve_mo_bind_ratio=f"{bind_ratio}%",
            twelve_mo_bound=twelve_mo_bound,
            twelve_mo_quoted=twelve_mo_quoted,
            twelve_mo_decline=twelve_mo_decline,
        )
        production_records.append(production)
    
    # Add all records at once
    db.bulk_save_objects(production_records)
    db.commit()
    return len(production_records)


def create_logs_for_underwriter(db: Session, employee: models.Employee, agencies: list, months: int = 12):
    """Create ~10 logs per month for an underwriter."""
    today = datetime.now()
    logs = []
    
    log_actions = ["Call / Zoom", "Email", "In Person"]
    log_notes_samples = [
        "Discussed renewal terms and coverage options",
        "Reviewed new submission requirements",
        "Followed up on pending quote",
        "Met to review loss history",
        "Discussed premium increase justification",
        "Reviewed policy changes and endorsements",
        "Discussed market conditions and availability",
        "Followed up on claims status",
        "Reviewed contract terms and conditions",
        "Discussed new business opportunities",
    ]
    
    for i in range(months):
        # Calculate date for this month
        month_date = today.replace(day=1) - timedelta(days=32 * i)
        
        # Create ~10 logs for this month
        logs_per_month = random.randint(8, 12)
        for j in range(logs_per_month):
            # Random day in the month
            day = random.randint(1, 28)
            log_date = month_date.replace(day=day)
            log_datetime = log_date.replace(
                hour=random.randint(9, 17),
                minute=random.randint(0, 59)
            )
            
            # Random agency and contact
            agency = random.choice(agencies)
            # Query contacts for this agency
            contacts = db.query(models.Contact).filter(models.Contact.agency_id == agency.id).all()
            contact = random.choice(contacts) if contacts else None
            
            log = models.Log(
                user=employee.name,
                datetime=log_datetime,
                action=random.choice(log_actions),
                agency_id=agency.id,
                office=employee.office_rel.code if employee.office_rel else None,
                contact_id=contact.id if contact else None,
                contact=contact.name if contact else None,
                notes=random.choice(log_notes_samples),
            )
            logs.append(log)
    
    db.bulk_save_objects(logs)
    db.commit()
    return len(logs)


def main():
    """Main function to populate test data."""
    db: Session = SessionLocal()
    
    try:
        print("=" * 60)
        print("POPULATING TEST DATA")
        print("=" * 60)
        
        # Step 0: Clear existing agencies, contacts, logs, and production data
        print("\n0. Clearing existing agencies, contacts, logs, and production data...")
        from sqlalchemy import delete
        log_count = db.query(models.Log).count()
        prod_count = db.query(models.Production).count()
        contact_count = db.query(models.Contact).count()
        agency_count = db.query(models.Agency).count()
        
        db.execute(delete(models.Log))
        db.execute(delete(models.Production))
        db.execute(delete(models.Contact))
        db.execute(delete(models.Agency))
        db.commit()
        print(f"   Cleared {agency_count} agencies, {contact_count} contacts, {log_count} logs, {prod_count} production records")
        
        # Step 1: Create or get offices
        print("\n1. Creating offices...")
        offices = []
        for code, name in OFFICE_NAMES:
            existing = db.query(models.Office).filter(models.Office.code == code).first()
            if existing:
                print(f"   Office {code} ({name}) already exists, using it")
                offices.append(existing)
            else:
                office = create_office(db, schemas.OfficeCreate(code=code, name=name))
                print(f"   Created office: {code} ({name})")
                offices.append(office)
        
        # Step 2: Create employees (5 per office)
        print("\n2. Creating employees (5 per office)...")
        all_employees = []
        for office in offices:
            office_employees = []
            for i in range(5):
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                name = f"{first_name} {last_name}"
                email = generate_email(first_name, last_name, "testcompany.com")
                
                # Check if employee exists
                existing = db.query(models.Employee).filter(
                    models.Employee.name == name,
                    models.Employee.email == email,
                    models.Employee.office_id == office.id
                ).first()
                
                if existing:
                    print(f"   Employee {name} already exists in {office.code}, skipping")
                    office_employees.append(existing)
                else:
                    employee = create_employee(
                        db,
                        schemas.EmployeeCreate(
                            name=name,
                            email=email,
                            office_id=office.id
                        )
                    )
                    print(f"   Created employee: {name} ({email}) in {office.code}")
                    office_employees.append(employee)
            
            all_employees.extend(office_employees)
        
        # Step 3: Create exactly 10 agencies
        print("\n3. Creating exactly 10 agencies...")
        all_agencies = []
        # Distribute agencies across employees
        employee_index = 0
        for i in range(10):
            # Cycle through employees
            employee = all_employees[employee_index % len(all_employees)]
            employee_index += 1
            
            agency_name = generate_agency_name()
            agency_code = generate_agency_code()
            
            # Make sure code is unique
            while db.query(models.Agency).filter(models.Agency.code == agency_code).first():
                agency_code = generate_agency_code()
            
            # Create agency directly to avoid the bug in create_agency with primary_underwriter
            agency = models.Agency(
                name=agency_name,
                code=agency_code,
                office_id=employee.office_id,
                primary_underwriter_id=employee.id,
                primary_underwriter=employee.name,
                active_flag=random.choice(["Active", "Inactive"]),
                email=generate_email("contact", agency_name.split()[0], "agency.com"),
                web_address=f"https://www.{agency_name.lower().replace(' ', '')}.com"
            )
            db.add(agency)
            db.commit()
            db.refresh(agency)
            all_agencies.append(agency)
            print(f"   Created agency {i+1}/10: {agency_name} ({agency_code}) for {employee.name}")
            
        # Step 4: Create contacts (5 per agency)
        print(f"\n4. Creating contacts (5 per agency)...")
        for agency in all_agencies:
            for j in range(5):
                first_name = random.choice(FIRST_NAMES)
                last_name = random.choice(LAST_NAMES)
                name = f"{first_name} {last_name}"
                title = random.choice(CONTACT_TITLES)
                email = generate_email(first_name, last_name, "agency.com")
                phone = generate_phone()
                
                contact = create_contact(
                    db,
                    schemas.ContactCreate(
                        name=name,
                        title=title,
                        email=email,
                        phone=phone,
                        agency_id=agency.id,
                        notes=f"Primary contact for {agency.name}"
                    )
                )
                print(f"      Created contact: {name} ({title}) for {agency.name}")
        
        # Step 5: Create production data (12 months) for all agencies
        print(f"\n5. Creating production data (12 months) for agencies...")
        for agency in all_agencies:
            # Get office code from agency
            office = db.query(models.Office).filter(models.Office.id == agency.office_id).first()
            office_code = office.code if office else "UNK"
            num_records = create_production_data(db, office_code, agency.code, agency.name, months=12)
            print(f"   Created {num_records} production records for {agency.name}")
        
        # Step 6: Create logs (~10 per month per underwriter, linked to contacts)
        print(f"\n6. Creating logs (~10 per month per underwriter, linked to contacts)...")
        # Create logs for employees who have agencies
        employees_with_agencies = {}
        for agency in all_agencies:
            if agency.primary_underwriter_id:
                if agency.primary_underwriter_id not in employees_with_agencies:
                    employees_with_agencies[agency.primary_underwriter_id] = []
                employees_with_agencies[agency.primary_underwriter_id].append(agency)
        
        for employee_id, employee_agencies_list in employees_with_agencies.items():
            employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
            if employee and employee_agencies_list:
                # Reload agencies with contacts
                for agency in employee_agencies_list:
                    db.refresh(agency)
                
                num_logs = create_logs_for_underwriter(db, employee, employee_agencies_list, months=12)
                print(f"   Created {num_logs} log entries for {employee.name}")
        
        print("\n" + "=" * 60)
        print("TEST DATA POPULATION COMPLETE!")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  Offices: {len(offices)}")
        print(f"  Employees: {len(all_employees)}")
        print(f"  Agencies: {len(all_agencies)}")
        
        # Count contacts and logs
        total_contacts = db.query(models.Contact).count()
        total_logs = db.query(models.Log).count()
        total_production = db.query(models.Production).count()
        
        print(f"  Contacts: {total_contacts}")
        print(f"  Production records: {total_production}")
        print(f"  Log entries: {total_logs}")
        print("\nSUCCESS: Database populated with test data!")
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()

