# Employee-Office Relationship Refactoring

## Problem Summary

The system had two separate lists (users and employees) with overlapping responsibilities, causing:
1. **Duplications**: Same person appearing multiple times when assigned to multiple offices
2. **Inconsistencies**: Duplicate password/auth fields in both tables
3. **Complexity**: Frontend creating multiple employee records (one per office) instead of one record with multiple office assignments

## Solution Implemented

### 1. Database Changes
- **Created `employee_offices` junction table** for many-to-many relationship between employees and offices
- **Made email unique** in employees table to prevent duplicates
- **Removed duplicate password/auth fields** from employees table (kept only in users table)
- **Kept `office_id` for backward compatibility** during migration transition

### 2. Model Changes
- Updated `Employee` model to use many-to-many relationship with `Office`
- Removed password/auth fields from Employee (now only in User table)
- Email is now unique (one employee per email)

### 3. API Changes
- Updated `EmployeeCreate` and `EmployeeUpdate` schemas to accept `office_ids` (array) instead of just `office_id`
- Updated CRUD functions to handle multiple office assignments
- Updated employee router to:
  - Check for duplicate emails (now unique)
  - Handle `office_ids` array for multiple office assignments
  - Populate `office_ids` in responses from the many-to-many relationship

### 4. Frontend Changes
- Updated `AdminPage` to create **single employee** with multiple `office_ids` instead of creating multiple employee records
- Updated employee interface to include `office_ids` array
- Updated employee listing/filtering to work with `office_ids`

## Migration Steps

### Step 1: Run Database Migration
```bash
cd backend
alembic upgrade head
```

This will:
- Create `employee_offices` junction table
- Migrate existing `office_id` data to the junction table
- Make email unique (handles duplicates by clearing email on duplicates)
- Note: Password fields are left in place for SQLite compatibility but are no longer used

### Step 2: Consolidate Duplicate Employees (Optional)
If you have duplicate employees (same email, different offices), run the consolidation script:
```bash
python backend/consolidate_duplicate_employees.py
```

This script will:
- Find employees with the same email
- Keep the first one and assign all offices to it
- Delete duplicate employee records
- Preserve user accounts

### Step 3: Update Frontend
The frontend code has been updated. Just rebuild:
```bash
cd frontend
npm run build
```

## Benefits

1. **No More Duplicates**: One employee per email, regardless of office assignments
2. **Cleaner Data Model**: Single source of truth for employee information
3. **Simpler Frontend Logic**: Create one employee, assign multiple offices
4. **Better Login Protocol**: Email is unique, making authentication more reliable
5. **Easier Management**: Update one employee record instead of multiple

## Backward Compatibility

- `office_id` field is still present in the database and schemas for backward compatibility
- Code checks both `office_ids` (new) and `office_id` (legacy) when needed
- Existing data is migrated automatically during the migration

## Next Steps

1. Run the migration: `alembic upgrade head`
2. Test employee creation with multiple offices
3. Test employee updates (changing office assignments)
4. Verify no duplicate employees appear in listings
5. (Optional) Run consolidation script if you have existing duplicates

## Notes

- The `office_id` column will be removed in a future migration after all code is updated
- Password/auth fields in employees table are no longer used but remain for SQLite compatibility
- All authentication now goes through the `users` table only


