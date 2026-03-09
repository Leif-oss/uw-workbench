# Local Testing Plan - Temp Password + Employee-Office Refactoring

## Overview
Test both the temporary password system and the employee-office refactoring locally before deploying to cloud.

## Prerequisites

1. **Backend running locally** on `http://localhost:8000`
2. **Frontend running locally** on `http://localhost:5173`
3. **Database** - Local SQLite database in `private/databases/`

## Step 1: Run Database Migration

```bash
cd backend
alembic upgrade head
```

This will:
- Create `employee_offices` junction table
- Migrate existing `office_id` data to junction table
- Make email unique
- Handle schema changes

**Expected Output:**
```
INFO  [alembic.runtime.migration] Running upgrade 0003_add_user_security_fields -> 0004_add_employee_offices_many_to_many
```

## Step 2: (Optional) Consolidate Duplicate Employees

If you have duplicate employees (same email, different offices):

```bash
python backend/consolidate_duplicate_employees.py
```

This will merge duplicates into single records with multiple office assignments.

## Step 3: Test Temporary Password System

### Test 3.1: Create New Employee with Temp Password

1. **Start backend and frontend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python -m uvicorn main:app --reload --port 8000

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Login as admin** (or use existing admin account)

3. **Navigate to Admin Page** → Employee Management

4. **Create a new employee:**
   - Name: "Test User"
   - Email: "testuser@example.com" (must be unique)
   - Role: "underwriter" (or any role)
   - Select one or more offices
   - Click "Add Employee"

5. **Verify temp password is shown:**
   - ✅ Alert popup should appear with:
     - Username (e.g., "testuser")
     - Temporary Password (e.g., "Temp!a7b3c9d2e5f1")
     - Message: "User must change password on first login"
   - ✅ Success message should also show temp password

6. **Copy the temp password** for next test

### Test 3.2: Login with Temporary Password

1. **Logout** from admin account

2. **Login with new user:**
   - Username: "testuser" (or email: "testuser@example.com")
   - Password: The temporary password from step 3.1

3. **Verify password change modal appears:**
   - ✅ Modal should appear immediately after login
   - ✅ Modal should NOT be dismissible (no X button or close)
   - ✅ Label should say "Temporary Password" (not "Current Password")

4. **Change password:**
   - Enter temporary password in "Temporary Password" field
   - Enter new password (must meet requirements: 8+ chars, uppercase, lowercase, number)
   - Confirm new password
   - Click "Change Password"

5. **Verify redirect:**
   - ✅ Should redirect to dashboard after successful password change
   - ✅ No password change modal on subsequent logins

### Test 3.3: Login with New Password

1. **Logout**

2. **Login again with new password:**
   - Username: "testuser"
   - Password: The new password you just set

3. **Verify:**
   - ✅ Login succeeds
   - ✅ No password change modal appears
   - ✅ Redirects directly to dashboard

## Step 4: Test Employee-Office Refactoring

### Test 4.1: Create Employee with Multiple Offices

1. **Create a new employee:**
   - Name: "Multi Office User"
   - Email: "multioffice@example.com"
   - Select **multiple offices** (check 2-3 offices)
   - Click "Add Employee"

2. **Verify:**
   - ✅ Only **ONE** employee record is created (not multiple)
   - ✅ Temp password is shown
   - ✅ Employee appears in employee list **once**

3. **Check employee details:**
   - ✅ Employee should show all assigned offices
   - ✅ No duplicate entries in the list

### Test 4.2: Update Employee Office Assignments

1. **Edit the employee** you just created

2. **Change office assignments:**
   - Add or remove offices
   - Click "Update Employee"

3. **Verify:**
   - ✅ Employee updates successfully
   - ✅ Office assignments are updated
   - ✅ Still only ONE employee record (no duplicates created)

### Test 4.3: Verify No Duplicates

1. **View employee list**

2. **Verify:**
   - ✅ Each employee appears only once
   - ✅ Employees with multiple offices show all offices
   - ✅ No duplicate entries for same email

### Test 4.4: Test Office Filtering

1. **Filter employees by office** (if your UI has this)

2. **Verify:**
   - ✅ Employees assigned to that office appear
   - ✅ Employees assigned to multiple offices appear when filtering by any of their offices

## Step 5: Test Edge Cases

### Test 5.1: Duplicate Email Prevention

1. **Try to create employee with existing email:**
   - Use email that already exists
   - Should get error: "Employee with email 'xxx' already exists"

2. **Verify:**
   - ✅ Error message is clear
   - ✅ No duplicate created

### Test 5.2: Employee with No Offices

1. **Create employee without selecting any offices**

2. **Verify:**
   - ✅ Employee is created successfully
   - ✅ Can be assigned to offices later

### Test 5.3: Password Requirements

1. **Try to set weak password:**
   - Too short (< 8 chars)
   - No uppercase
   - No lowercase
   - No number

2. **Verify:**
   - ✅ Appropriate error messages
   - ✅ Password change fails
   - ✅ User must enter valid password

## Step 6: Verify Database State

1. **Check database directly:**
   ```bash
   sqlite3 private/databases/uw_workbench.db
   ```

2. **Verify employee_offices table:**
   ```sql
   SELECT * FROM employee_offices;
   ```
   - Should show employee-office relationships

3. **Verify employees table:**
   ```sql
   SELECT id, name, email, office_id FROM employees;
   ```
   - Should show unique emails
   - `office_id` may still exist (backward compatibility)

4. **Verify users table:**
   ```sql
   SELECT id, username, email, employee_id, must_change_password FROM users;
   ```
   - New users should have `must_change_password=1`
   - Users who changed password should have `must_change_password=0`

## Troubleshooting

### Migration Fails
- Check if database is locked (close any connections)
- Check alembic version: `alembic current`
- Check migration file exists: `backend/alembic/versions/0004_add_employee_offices_many_to_many.py`

### Temp Password Not Shown
- Check backend logs for errors
- Verify `generate_temporary_password()` is called
- Check response in browser DevTools Network tab
- Verify frontend is checking `response.temporary_password`

### Duplicate Employees Still Appear
- Run consolidation script: `python backend/consolidate_duplicate_employees.py`
- Check if migration ran successfully
- Verify email uniqueness constraint is in place

### Password Change Modal Doesn't Appear
- Check login response includes `must_change_password: true`
- Check browser console for errors
- Verify `ChangePasswordModal` component is imported
- Check `LoginPage.tsx` handles `must_change_password` flag

## Success Criteria

✅ **Temp Password System:**
- Temp password generated and shown to admin
- User can login with temp password
- Password change modal appears on first login
- User can set new password
- Subsequent logins work with new password

✅ **Employee-Office Refactoring:**
- Single employee record per email
- Multiple offices can be assigned to one employee
- No duplicate employees in listings
- Office assignments update correctly
- Database migration successful

## Next Steps After Local Testing

Once all tests pass locally:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Implement temp password system and employee-office refactoring"
   ```

2. **Deploy to cloud:**
   - Run migration on cloud database
   - Deploy updated code
   - Run consolidation script if needed
   - Test on cloud environment

3. **Monitor:**
   - Check cloud logs for errors
   - Verify temp passwords work on cloud
   - Verify no duplicate employees appear


