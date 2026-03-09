# How to Restore Leif User

## Current Situation
- **Current Employee**: test one (leifkeller@hotmail.com)
- **Current User**: leifkeller (admin)
- **Missing**: Leif (leif@deanshomer.com)

## Important Note
The SMTP password reset **did NOT** affect the database. The password reset only updated Google Secret Manager, which is completely separate from the database.

Something else must have happened (possibly a database reset, cleanup endpoint call, or manual deletion).

## Solution: Restore Leif Manually

Since we made the database static (no auto-creation), you need to manually create Leif.

### Option 1: Via Admin Panel (Recommended)

1. **Log in** to the cloud app:
   - URL: https://uw-workbench-frontend-4szvavge6a-uc.a.run.app
   - Username: `leifkeller`
   - Password: (your password)

2. **Go to Admin page** (should be visible since you're admin)

3. **Add New Employee:**
   - Click "Add Employee" or similar button
   - Fill in:
     - **Name**: `Leif`
     - **Email**: `leif@deanshomer.com`
     - **Role**: `admin`
     - **Username**: `leif`
     - **Password**: (set a password you'll remember)
   - Save

4. **Verify:**
   - Leif should now appear in the employee list
   - You should be able to log in as `leif` with the password you set

### Option 2: Via API (If Admin Panel Doesn't Work)

If you can't access the admin panel, you can create Leif via API:

```powershell
$backendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"
$authToken = "YOUR_AUTH_TOKEN"  # Get this from logging in as leifkeller

# Create employee
$employeeData = @{
    name = "Leif"
    email = "leif@deanshomer.com"
    role = "admin"
    username = "leif"
    password = "YOUR_PASSWORD"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$backendUrl/employees" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $authToken"
        "Content-Type" = "application/json"
    } `
    -Body $employeeData
```

### Option 3: Use Cleanup Endpoint (Will Delete "test one")

**WARNING**: This will delete "test one" and only keep Leif.

```powershell
$backendUrl = "https://uw-workbench-backend-4szvavge6a-uc.a.run.app"
$authToken = "YOUR_AUTH_TOKEN"

Invoke-RestMethod -Uri "$backendUrl/admin/cleanup-database" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $authToken"
        "Content-Type" = "application/json"
    }
```

## Prevention

To prevent this from happening again:

1. **Don't call cleanup endpoints** unless you really need to
2. **Don't manually delete users** unless necessary
3. **Database is now static** - no auto-deletion or auto-creation
4. **Always verify** before deleting users/employees

## Why Did This Happen?

Possible causes:
- Cleanup endpoint was called
- Manual deletion via admin panel
- Database was reset/recreated
- Someone deleted Leif manually

The SMTP password reset is **NOT** the cause - it only affects email sending, not the database.



