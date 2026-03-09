# Temporary Password Implementation Plan

## Overview
Since emails aren't working, we'll use a temporary password system where:
1. Each new user gets a **unique temporary password** (e.g., `Temp!a7b3c9d2e5f1`)
2. Admin sees the temp password when creating employee
3. User must change password on first login
4. Frontend shows password change modal on first login

## Backend Changes ✅

### 1. Generate Temporary Password Function ✅
- Added `generate_temporary_password()` in `backend/routers/auth.py`
- Format: `Temp!{8 random chars}{2 digits}` (meets all requirements)

### 2. Login Returns must_change_password Flag ✅
- Modified `/auth/login` to return `must_change_password` in response
- Frontend can check this flag

### 3. Employee Creation ✅
- Modified `create_employee` to:
  - Generate unique temp password per user
  - Set `must_change_password=True`
  - Return temp password in response
  - Send welcome email with temp password (if email works)

## Frontend Changes Needed

### 1. Display Temp Password on Employee Creation
- Modify `AdminPage.tsx` to check response for `temporary_password`
- Show alert/modal with:
  - Username
  - Temporary password
  - Message: "Share this password with the user. They must change it on first login."

### 2. Password Change Modal Component
- Create `ChangePasswordModal.tsx` component
- Shows on first login if `must_change_password=true`
- Requires current password (temp password) + new password + confirm
- Calls `/auth/change-password` endpoint

### 3. Update Login Flow
- In `LoginPage.tsx`, after successful login:
  - Check `response.must_change_password`
  - If true, show password change modal instead of redirecting
  - After password change, redirect to dashboard

## Testing Checklist
- [ ] Create new employee - verify temp password is shown
- [ ] Login with temp password - verify password change modal appears
- [ ] Change password - verify redirect to dashboard
- [ ] Login with new password - verify no password change prompt
- [ ] Verify `must_change_password` flag is cleared after change

## Security Notes
- Temp passwords are unique per user (more secure than shared default)
- Passwords meet all requirements (uppercase, lowercase, number, special char, >= 8 chars)
- Users cannot skip password change (required on first login)
- Old temp password is invalid after change



