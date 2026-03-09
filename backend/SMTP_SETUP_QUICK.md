# Quick SMTP Setup for Testing

Since you can't use Gmail App Passwords, here are your options:

## Option 1: Mailtrap (Recommended for Testing)

Mailtrap is perfect for testing - it captures emails without actually sending them.

1. **Sign up at https://mailtrap.io** (free tier available)

2. **Get SMTP credentials:**
   - Go to Inboxes → My Inbox
   - Select "SMTP Settings" tab
   - Copy the credentials

3. **Update `backend/.env`:**
   ```
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-mailtrap-username
   SMTP_PASSWORD=your-mailtrap-password
   SMTP_FROM_EMAIL=Leif@deanshomer.com
   SMTP_FROM_NAME=UW Workbench
   FRONTEND_URL=http://localhost:5173
   ```

4. **Restart backend** - emails will appear in your Mailtrap inbox (they won't actually send)

## Option 2: Get SMTP Settings from IT

Contact your IT admin and ask for:
- SMTP server hostname (e.g., `smtp.deanshomer.com` or `mail.deanshomer.com`)
- SMTP port (usually 587 for TLS or 465 for SSL)
- Your email credentials
- Whether you need any special authentication

Then update `backend/.env` with those settings.

## Option 3: Use a Different Email Account

If you have access to another email account (personal Gmail, etc.):
1. Create an App Password for that account
2. Use that account's SMTP settings
3. The "from" address will still be your organization email in the email content



