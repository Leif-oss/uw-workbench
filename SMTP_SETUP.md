# SMTP Email Configuration Guide

This guide will help you set up email sending for welcome emails and password resets.

## Option 1: Gmail (Recommended for Testing)

### Steps:

1. **Enable 2-Step Verification** (if not already enabled)
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other (Custom name)" and enter "UW Workbench"
   - Click "Generate"
   - Copy the 16-character password (spaces don't matter)

3. **Configure backend/.env**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=UW Workbench
   FRONTEND_URL=http://localhost:5173
   ```

4. **Restart backend server**

## Option 2: Mailtrap (Testing Service)

Mailtrap is great for testing - it captures emails without actually sending them.

1. **Sign up at mailtrap.io** (free tier available)

2. **Get SMTP credentials**
   - Go to Inboxes → My Inbox
   - Select "SMTP Settings" tab
   - Copy the credentials

3. **Configure backend/.env**
   ```
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-mailtrap-username
   SMTP_PASSWORD=your-mailtrap-password
   SMTP_FROM_EMAIL=noreply@uw-workbench.com
   SMTP_FROM_NAME=UW Workbench
   FRONTEND_URL=http://localhost:5173
   ```

4. **Restart backend server**

5. **View test emails** in Mailtrap inbox (they won't actually send)

## Option 3: Your Organization's SMTP Server

If you have your own SMTP server:

1. **Get SMTP credentials from your IT/admin**

2. **Configure backend/.env**
   ```
   SMTP_HOST=your-smtp-server.com
   SMTP_PORT=587  # or 465 for SSL
   SMTP_USER=your-username
   SMTP_PASSWORD=your-password
   SMTP_FROM_EMAIL=noreply@yourcompany.com
   SMTP_FROM_NAME=UW Workbench
   FRONTEND_URL=http://localhost:5173
   ```

3. **Restart backend server**

## Testing

After configuration:

1. Restart your backend server
2. Create a new employee via the Admin page
3. Check:
   - **Gmail/Mailtrap**: Check inbox (or Mailtrap inbox)
   - **Not configured**: Check backend console logs for email content

## Troubleshooting

- **"Email not configured" warning**: SMTP settings not filled in correctly
- **Connection errors**: Check SMTP_HOST, SMTP_PORT, and firewall settings
- **Authentication errors**: Double-check SMTP_USER and SMTP_PASSWORD
- **For Gmail**: Make sure you're using an App Password, not your regular password

## Production

For production (Cloud Run), set these as environment variables or use Google Cloud Secret Manager.



