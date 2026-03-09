# Archive Folder

This folder contains old, unused, or completed migration scripts and documentation that are kept for reference but are no longer actively used.

## Structure

- **backend-migrations/** - One-time database migration scripts that have already been run
- **backend-utilities/** - Old utility scripts that are no longer needed
- **frontend-scripts/** - Old frontend fix/utility scripts
- **old-docs/** - Outdated documentation files

## Migration Scripts

These scripts were used to migrate the database schema and have already been executed. They are kept for reference only.

### Completed Migrations:
- `add_agency_dba_email.py` - Added DBA and email columns to agencies table
- `add_contact_fields.py` - Added additional contact fields
- `add_contact_id_to_logs.py` - Added contact_id foreign key to logs
- `add_contact_name_to_logs.py` - Added contact name column to logs
- `add_email_to_employees.py` - Added email column to employees table
- `add_employee_fields.py` - Added website, password fields to employees
- `add_production_columns.py` - Added new production tracking columns
- `add_submissions_table.py` - Created submissions table
- `create_audit_log_table.py` - Created audit_logs table

## Utility Scripts

- `ingest_csv.py` - One-time CSV import script (no longer needed)
- `check_logs.py` - Database inspection utility (replaced by better tools)

## Frontend Scripts

- `fix_agencies.py` - One-time fix script for AgenciesPage.tsx

## Notes

- **Do not run these scripts again** - They have already been executed
- These files are kept for historical reference only
- If you need similar functionality, create new scripts rather than reusing these
- Database migrations should now use Alembic (see `backend/alembic/`)

## When to Archive Files

Archive files when:
- They are one-time migration scripts that have been run
- They are old utility scripts replaced by better solutions
- They are outdated documentation
- They are experimental code that didn't make it to production

## When NOT to Archive

Keep files in the main project when:
- They are still actively used
- They are part of the build/deployment process
- They are referenced in documentation
- They are needed for new developers to understand the codebase

