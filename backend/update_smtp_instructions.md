# Update SMTP Configuration

## Update these lines in `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-secondary-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password-here
SMTP_FROM_EMAIL=your-secondary-gmail@gmail.com
SMTP_FROM_NAME=UW Workbench
```

## Important:
1. Replace `your-secondary-gmail@gmail.com` with your actual Gmail address
2. Replace `your-16-char-app-password-here` with the 16-character App Password (not your regular password)
3. Make sure you have 2-Step Verification enabled and generated an App Password from: https://myaccount.google.com/apppasswords

## After updating:
1. Save the file
2. Restart the backend server
3. Test by creating a new employee



