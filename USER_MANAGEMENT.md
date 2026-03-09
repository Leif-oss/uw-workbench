# User Management & Security Guide

This document describes the user management and password security features.

## Features

### ✅ Password Security
- **Minimum length**: 8 characters
- **Requirements**: Must contain uppercase, lowercase, and number
- **Password strength validation** on all password changes
- **Secure hashing**: bcrypt with automatic salting

### ✅ Account Security
- **Failed login protection**: Account locks after 5 failed attempts
- **Lockout duration**: 30 minutes
- **Account status**: Active/inactive flag (managed by admin)
- **Password expiration**: Force password change on first login (optional)

### ✅ Password Reset Flow
1. User requests password reset via `/auth/request-password-reset`
2. System generates secure token (expires in 1 hour)
3. Email sent with reset link (if email configured)
4. User clicks link and enters new password
5. Password reset token invalidated after use

### ✅ Admin User Management
- Create users with email addresses
- Set initial passwords
- Send welcome emails (optional)
- Update user details (username, email, password, roles)
- Activate/deactivate accounts
- Link users to employees
- View all users

### ✅ Email Configuration

Email is sent for:
- Password reset requests
- Welcome emails (when creating new users)

**Required Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=UW Workbench
FRONTEND_URL=https://your-frontend-url.com
```

**Gmail Setup:**
1. Enable 2-factor authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password (not regular password) for `SMTP_PASSWORD`

**Other Email Providers:**
- Outlook: `smtp-mail.outlook.com:587`
- SendGrid: `smtp.sendgrid.net:587`
- AWS SES: Use their SMTP endpoint

## API Endpoints

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "leif",
  "password": "1qazxsw2"
}
```

**Response:**
```json
{
  "access_token": "token...",
  "token_type": "bearer",
  "username": "leif",
  "is_admin": true,
  "must_change_password": false,
  "expires_in": 86400
}
```

#### Request Password Reset
```http
POST /auth/request-password-reset
Content-Type: application/json

{
  "username": "leif"
}
```

**Response:**
```json
{
  "message": "If an account exists with that username/email, a password reset link has been sent."
}
```

#### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "new_password": "NewSecurePassword123"
}
```

#### Change Password (Authenticated)
```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "old-password",
  "new_password": "NewSecurePassword123"
}
```

### User Management (Admin Only)

#### List All Users
```http
GET /users
Authorization: Bearer <admin-token>
```

#### Create User
```http
POST /users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePassword123",
  "is_admin": false,
  "employee_id": 1,
  "send_welcome_email": true
}
```

#### Update User
```http
PATCH /users/{user_id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "is_active": true,
  "is_admin": false
}
```

#### Delete User
```http
DELETE /users/{user_id}
Authorization: Bearer <admin-token>
```

## Frontend Implementation

### Password Reset Page

Create `/frontend/src/pages/ResetPasswordPage.tsx`:

```tsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiPost } from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/auth/reset-password', {
        token,
        new_password: password
      });
      alert('Password reset successfully! Please login.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
```

### Request Password Reset Page

Create `/frontend/src/pages/ForgotPasswordPage.tsx`:

```tsx
import { useState } from 'react';
import { apiPost } from '../api/client';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiPost('/auth/request-password-reset', { username });
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="forgot-password-page">
        <h2>Check Your Email</h2>
        <p>If an account exists, a password reset link has been sent to your email.</p>
      </div>
    );
  }

  return (
    <div className="forgot-password-page">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username or Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}
```

## Best Practices

### For Administrators

1. **Create users with email addresses** - Required for password resets
2. **Set strong initial passwords** - Meet minimum requirements
3. **Send welcome emails** - Users get credentials via email
4. **Review user list regularly** - Deactivate unused accounts
5. **Use employee linking** - Connect users to employee records

### For Users

1. **Use strong passwords** - Mix of uppercase, lowercase, numbers
2. **Change password regularly** - Especially after first login
3. **Keep email updated** - Required for password resets
4. **Don't share accounts** - Each user should have their own login

### Security Recommendations

1. **Enable email** - Password resets require email
2. **Regular audits** - Review user access regularly
3. **Deactivate unused accounts** - Set `is_active=false`
4. **Monitor failed logins** - Check audit logs
5. **Use HTTPS** - Always use HTTPS in production

## Troubleshooting

### Email Not Sending

1. Check SMTP environment variables
2. Verify SMTP credentials (use App Password for Gmail)
3. Check firewall/network allows SMTP connections
4. Review backend logs for email errors

### Password Reset Not Working

1. Check token hasn't expired (1 hour limit)
2. Verify email is configured for user
3. Check frontend URL in reset link matches `FRONTEND_URL`
4. Review backend logs for errors

### Account Locked

- Wait 30 minutes for automatic unlock
- Admin can manually unlock by setting `failed_login_attempts=0` and `locked_until=null`

## Database Schema

Users table includes:
- `email` - For password resets and notifications
- `password_reset_token` - Secure token for resets
- `password_reset_expires` - Token expiration time
- `failed_login_attempts` - Track failed logins
- `locked_until` - Account lockout time
- `must_change_password` - Force password change flag



