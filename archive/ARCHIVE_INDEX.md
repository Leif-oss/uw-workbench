# Archive Index

This document tracks what has been archived and why.

## Archived Files

### Documentation (old-docs/)
- **CLEANUP_SUMMARY.md** - Temporary cleanup summary document

### Backend Migration Scripts (backend-migrations/)
These are one-time database migration scripts that have already been executed:

1. **add_agency_dba_email.py** - Added DBA and email columns to agencies table
2. **add_contact_fields.py** - Added additional contact fields (title, notes, linkedin_url)
3. **add_contact_id_to_logs.py** - Added contact_id foreign key to logs table
4. **add_contact_name_to_logs.py** - Added contact name column to logs table
5. **add_email_to_employees.py** - Added email column to employees table
6. **add_employee_fields.py** - Added website, password_hash, password_reset_token, password_reset_expires to employees
7. **add_production_columns.py** - Added new production tracking columns (standard_lines, surplus_lines, etc.)
8. **add_submissions_table.py** - Created submissions table for document scrubber
9. **create_audit_log_table.py** - Created audit_logs table for security auditing

**Status:** All migrations have been completed. These scripts are kept for reference only.

### Backend Utilities (backend-utilities/)
Old utility scripts that are no longer actively used:

1. **ingest_csv.py** - One-time CSV import script for migrating data from old CRM system
   - **Reason:** Data migration complete, no longer needed
   
2. **check_logs.py** - Database inspection utility for checking log entries
   - **Reason:** Replaced by better database tools and API endpoints

### Frontend Scripts (frontend-scripts/)
1. **fix_agencies.py** - One-time Python script to fix AgenciesPage.tsx
   - **Reason:** Fix has been applied, script no longer needed

### PowerShell Scripts (root)
1. **run_backend.ps1** - Old backend startup script
   - **Reason:** Replaced by `start_backend.ps1` with better error handling
   
2. **run_server.ps1** - Old server startup script from backend folder
   - **Reason:** Replaced by `start_backend.ps1` in root
   
3. **run_in_existing_window.ps1** - Interactive script for running in existing PowerShell window
   - **Reason:** Not being used, replaced by `start_backend.ps1` and `start_frontend.ps1`

## Files Kept (Still Useful)

### Active Scripts
- **start_backend.ps1** - Current backend startup script
- **start_frontend.ps1** - Current frontend startup script
- **restart_app.ps1** - App restart script
- **backend/create_admin_user.py** - Still useful for setting up admin users
- **backend/clear_agency_production_data.py** - Utility function still in use

## Archive Policy

### When to Archive:
- ✅ One-time migration scripts that have been executed
- ✅ Old utility scripts replaced by better solutions
- ✅ Outdated documentation
- ✅ Experimental code that didn't make it to production
- ✅ Old startup scripts replaced by newer versions

### When NOT to Archive:
- ❌ Scripts still actively used
- ❌ Part of build/deployment process
- ❌ Referenced in current documentation
- ❌ Needed for new developers to understand the codebase

## Restoration

If you need to restore any archived file:
1. Check this index to understand what the file does
2. Copy it back to its original location
3. Review it carefully - it may be outdated
4. Test thoroughly before using

## Maintenance

- Review this archive periodically (every 6 months)
- Delete files that are definitely no longer needed
- Update this index when adding new files to archive

