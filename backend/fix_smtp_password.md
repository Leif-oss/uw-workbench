# Gmail App Password Setup

## The Issue
Your password is 19 characters, but Gmail App Passwords are exactly **16 characters** (formatted as xxxx xxxx xxxx xxxx but used without spaces).

## Steps to Get the Correct App Password:

1. **Go to:** https://myaccount.google.com/apppasswords
   - You must be signed in to the Gmail account you want to use

2. **Enable 2-Step Verification** (if not already enabled):
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification" and enable it

3. **Generate App Password:**
   - At https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)"
   - Enter name: "UW Workbench"
   - Click "Generate"

4. **Copy the Password:**
   - You'll see a 16-character password like: `abcd efgh ijkl mnop`
   - **Important:** Remove the spaces and use just the 16 characters: `abcdefghijklmnop`
   - Or use it with spaces - Gmail accepts both, but no spaces is cleaner

5. **Update backend/.env:**
   ```
   SMTP_PASSWORD=abcdefghijklmnop
   ```
   (Use the 16 characters WITHOUT spaces)

6. **Restart backend** and test again!

## If You Still Can't Generate App Password:
- Make sure you're signed into the correct Gmail account
- Make sure 2-Step Verification is enabled
- Try signing out and back into Google
- Check if your Google account has any security restrictions



