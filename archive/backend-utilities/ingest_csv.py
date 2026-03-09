"""
One-time/backfill loader to push local CRM CSVs into the FastAPI/SQLite backend.

Usage:
    python -m backend.ingest_csv --data-dir "C:\\Users\\leifk\\OneDrive\\Desktop\\PythonCode\\CRMAPP"
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional
import csv

from sqlalchemy import select, inspect

from . import crud, models, schemas
from .database import Base, SessionLocal, engine

# Office codes -> friendly names used in the Streamlit app
OFFICE_LABELS: Dict[str, str] = {
    "BRA": "Orange County",
    "FNO": "Fresno",
    "LAF": "Walnut Creek",
    "LKO": "Portland",
    "MID": "Mid West",
    "PAS": "Pasadena",
    "PHX": "Phoenix",
    "RCH": "Roseville",
    "REN": "Reno",
    "SDO": "San Diego",
    "SEA": "Seattle",
    "LVS": "Las Vegas",
    "MHL": "Woodland Hills",
}


def _to_int(val) -> Optional[int]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return int(val)
    val = str(val).strip()
    if not val:
        return None
    try:
        return int(float(val))
    except ValueError:
        return None


def _to_str(val) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _parse_dt(val) -> datetime:
    if isinstance(val, datetime):
        return val
    if val is None:
        return datetime.now()
    txt = str(val).strip()
    if not txt:
        return datetime.now()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y %H:%M"):
        try:
            return datetime.strptime(txt, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(txt)
    except ValueError:
        return datetime.now()


def _encode_contact_note(contact_name: str, notes: str) -> str:
    base = notes or ""
    if contact_name:
        return f"[CONTACT:{contact_name}] {base}".strip()
    return base.strip()


def ensure_schema():
    """Apply minimal in-place migrations for sqlite when columns are missing."""
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("agencies")}
    with engine.begin() as conn:
        if "primary_underwriter" not in cols:
            conn.exec_driver_sql("ALTER TABLE agencies ADD COLUMN primary_underwriter VARCHAR(255)")
        if "active_flag" not in cols:
            conn.exec_driver_sql("ALTER TABLE agencies ADD COLUMN active_flag VARCHAR(50)")


def upsert_offices(session, csv_path: Path) -> Dict[str, int]:
    code_to_id: Dict[str, int] = {}
    if not csv_path.exists():
        return code_to_id
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = _to_str(row.get("OfficeName"))
            if not code:
                continue
            name = OFFICE_LABELS.get(code, code)
            existing = session.execute(select(models.Office).where(models.Office.code == code)).scalar_one_or_none()
            if existing:
                existing.name = name
                code_to_id[code] = existing.id
                continue
            obj = models.Office(code=code, name=name)
            session.add(obj)
            session.flush()
            code_to_id[code] = obj.id
    session.commit()
    return code_to_id


def upsert_employees(session, csv_path: Path, office_map: Dict[str, int]) -> None:
    if not csv_path.exists():
        return
    existing_by_id = {
        emp.id: emp for emp in session.execute(select(models.Employee)).scalars().all() if emp.id is not None
    }
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            emp_id = _to_int(row.get("EmployeeID"))
            name = _to_str(row.get("Name"))
            office_code = _to_str(row.get("Office"))
            office_id = office_map.get(office_code)
            if not name:
                continue
            if office_code and office_id is None:
                # create office on the fly if needed
                office_obj = models.Office(code=office_code, name=OFFICE_LABELS.get(office_code, office_code))
                session.add(office_obj)
                session.flush()
                office_map[office_code] = office_obj.id
                office_id = office_obj.id
            existing = existing_by_id.get(emp_id) if emp_id is not None else None
            if not existing:
                existing = session.execute(
                    select(models.Employee).where(models.Employee.name == name, models.Employee.office_id == office_id)
                ).scalar_one_or_none()
            if existing:
                existing.name = name
                existing.office_id = office_id
                if emp_id is not None:
                    existing_by_id[emp_id] = existing
            else:
                obj = models.Employee(id=emp_id, name=name, office_id=office_id)
                session.add(obj)
                if emp_id is not None:
                    existing_by_id[emp_id] = obj
    session.commit()


def upsert_agencies(session, csv_path: Path, office_map: Dict[str, int]) -> Dict[int, int]:
    """Return map of csv AgencyID -> db id."""
    id_map: Dict[int, int] = {}
    if not csv_path.exists():
        return id_map
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ag_id = _to_int(row.get("AgencyID"))
            code = _to_str(row.get("AgencyCode"))
            name = _to_str(row.get("AgencyName"))
            office_code = _to_str(row.get("Office"))
            office_id = office_map.get(office_code)
            notes = _to_str(row.get("Notes"))
            primary_underwriter = _to_str(row.get("PrimaryUnderwriter")) or None
            active_flag = _to_str(row.get("ActiveFlag")) or None
            if not code:
                continue
            existing = session.execute(select(models.Agency).where(models.Agency.code == code)).scalar_one_or_none()
            if existing:
                existing.name = name
                existing.office_id = office_id
                existing.web_address = _to_str(row.get("WebAddress"))
                existing.notes = notes
                existing.primary_underwriter = primary_underwriter
                existing.active_flag = active_flag
                id_map[ag_id] = existing.id
            else:
                obj = models.Agency(
                    id=ag_id,
                    name=name,
                    code=code,
                    office_id=office_id,
                    web_address=_to_str(row.get("WebAddress")),
                    notes=notes,
                    primary_underwriter=primary_underwriter,
                    active_flag=active_flag,
                )
                session.add(obj)
                session.flush()
                id_map[ag_id] = obj.id
    session.commit()
    return id_map


def upsert_contacts(session, csv_path: Path, agency_id_map: Dict[int, int]) -> None:
    if not csv_path.exists():
        return
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            contact_id = _to_int(row.get("ContactID"))
            agency_id = _to_int(row.get("AgencyID"))
            if agency_id in agency_id_map:
                agency_id = agency_id_map[agency_id]
            if agency_id is None:
                continue
            name = _to_str(row.get("Name"))
            if not name:
                continue
            existing = session.get(models.Contact, contact_id) if contact_id is not None else None
            if not existing:
                existing = session.execute(
                    select(models.Contact).where(
                        models.Contact.agency_id == agency_id, models.Contact.name == name, models.Contact.email == _to_str(row.get("Email"))
                    )
                ).scalar_one_or_none()
            if existing:
                existing.title = _to_str(row.get("Role"))
                existing.email = _to_str(row.get("Email"))
                existing.phone = _to_str(row.get("Phone"))
                existing.agency_id = agency_id
            else:
                session.add(
                    models.Contact(
                        id=contact_id,
                        name=name,
                        title=_to_str(row.get("Role")),
                        email=_to_str(row.get("Email")),
                        phone=_to_str(row.get("Phone")),
                        agency_id=agency_id,
                    )
                )
    session.commit()


def upsert_logs(session, csv_path: Path, agency_id_map: Dict[int, int]) -> None:
    if not csv_path.exists():
        return
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            log_id = _to_int(row.get("LogID"))
            agency_id = _to_int(row.get("AgencyID"))
            if agency_id in agency_id_map:
                agency_id = agency_id_map[agency_id]
            contact_name = _to_str(row.get("ContactName"))
            notes = _to_str(row.get("Notes"))
            existing = session.get(models.Log, log_id) if log_id is not None else None
            if existing:
                existing.user = _to_str(row.get("EmployeeName"))
                existing.datetime = _parse_dt(row.get("Date"))
                existing.action = _to_str(row.get("Type"))
                existing.agency_id = agency_id
                existing.office = _to_str(row.get("Office"))
                existing.notes = _encode_contact_note(contact_name, notes)
            else:
                session.add(
                    models.Log(
                        id=log_id,
                        user=_to_str(row.get("EmployeeName")),
                        datetime=_parse_dt(row.get("Date")),
                        action=_to_str(row.get("Type")),
                        agency_id=agency_id,
                        office=_to_str(row.get("Office")),
                        notes=_encode_contact_note(contact_name, notes),
                    )
                )
    session.commit()


def upsert_tasks(session, csv_path: Path, agency_id_map: Dict[int, int]) -> None:
    if not csv_path.exists():
        return
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            task_id = _to_int(row.get("TaskID"))
            agency_id = _to_int(row.get("AgencyID"))
            if agency_id in agency_id_map:
                agency_id = agency_id_map[agency_id]
            existing = session.get(models.Task, task_id) if task_id is not None else None
            if existing:
                existing.title = _to_str(row.get("Title"))
                existing.due_date = _parse_dt(row.get("DueDate")) if _to_str(row.get("DueDate")) else None
                existing.status = _to_str(row.get("Status"))
                existing.owner = _to_str(row.get("Owner"))
                existing.notes = _to_str(row.get("Notes"))
                existing.agency_id = agency_id
            else:
                session.add(
                    models.Task(
                        id=task_id,
                        title=_to_str(row.get("Title")),
                        due_date=_parse_dt(row.get("DueDate")) if _to_str(row.get("DueDate")) else None,
                        status=_to_str(row.get("Status")),
                        owner=_to_str(row.get("Owner")),
                        notes=_to_str(row.get("Notes")),
                        agency_id=agency_id,
                    )
                )
    session.commit()


def upsert_production(session, csv_path: Path) -> int:
    if not csv_path.exists():
        return 0
    rows = []
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            payload = schemas.ProductionCreate(
                office=_to_str(row.get("Office")),
                agency_code=_to_str(row.get("AgencyCode")),
                agency_name=_to_str(row.get("AgencyName")),
                active_flag=_to_str(row.get("ActiveFlag")) or None,
                month=_to_str(row.get("Month")),
                all_ytd_wp=_to_int(row.get("AllYTDWP")),
                all_ytd_nb=_to_int(row.get("AllYTDNB")),
                pytd_wp=_to_int(row.get("PYTDWP")),
                pytd_nb=_to_int(row.get("PYTDNB")),
                py_total_nb=_to_int(row.get("PYTotalNB")),
            )
            rows.append(payload)
    return crud.bulk_upsert_production(session, rows)


def guess_data_dir() -> Optional[Path]:
    candidates = []
    here = Path(__file__).resolve()
    candidates.append(Path.cwd())
    candidates.extend(here.parents)
    for cand in candidates:
        if (cand / "crm_agencies.csv").exists():
            return cand
    return None


def main():
    parser = argparse.ArgumentParser(description="Load CSVs into the CRM backend database.")
    parser.add_argument("--data-dir", type=Path, default=None, help="Directory containing crm_*.csv files.")
    args = parser.parse_args()

    data_dir = args.data_dir or guess_data_dir()
    if not data_dir:
        raise SystemExit("Could not find csv files; specify --data-dir pointing to the CRMAPP folder.")
    data_dir = data_dir.resolve()

    Base.metadata.create_all(bind=engine)
    ensure_schema()
    session = SessionLocal()
    try:
        office_map = upsert_offices(session, data_dir / "crm_offices.csv")
        upsert_employees(session, data_dir / "crm_employees.csv", office_map)
        agency_id_map = upsert_agencies(session, data_dir / "crm_agencies.csv", office_map)
        upsert_contacts(session, data_dir / "crm_contacts.csv", agency_id_map)
        upsert_logs(session, data_dir / "crm_logs.csv", agency_id_map)
        upsert_tasks(session, data_dir / "crm_tasks.csv", agency_id_map)
        prod_written = upsert_production(session, data_dir / "crm_production.csv")
        print("Import complete.")
        print(f"Offices: {len(office_map)}")
        print(f"Agencies: {len(agency_id_map)}")
        print(f"Production rows written: {prod_written}")
    finally:
        session.close()


if __name__ == "__main__":
    main()
