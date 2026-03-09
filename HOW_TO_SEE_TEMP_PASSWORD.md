# How to See Temporary Password

## When You Create a New Employee:

1. **Browser Alert Popup** - An alert popup should appear immediately after clicking "Add Employee" with:
   - Username
   - Temporary Password
   - Instructions

2. **Success Message** - The green success message at the top of the page will also show:
   - Username
   - Temporary Password
   - Instructions

## If You Don't See It:

### Check Browser Console:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for logs like:
   - "Employee creation response: ..."
   - Check if `temporary_password` and `username` are in the response

### Check Backend Deployment:
The backend code needs to be deployed for this to work. Check if:
- `generate_temporary_password()` function exists in `backend/routers/auth.py`
- Employee creation code uses it in `backend/routers/employees.py`

### Manual Check:
1. After creating employee, check browser console
2. Look for the API response
3. It should contain:
   ```json
   {
     "id": 123,
     "name": "Employee Name",
     "email": "email@example.com",
     "temporary_password": "Temp!a7b3c9d2e5f1",
     "username": "username"
   }
   ```

## If Backend Not Deployed:

The temp password feature requires backend changes to be deployed. If not deployed:
1. Deploy backend changes
2. Or check employee/user in database directly for password reset token

## Quick Fix:

If you need the password now and it's not showing:
1. Check browser console for the response
2. Look at Network tab → Find POST /employees request → View Response
3. The temp password should be in the response body



