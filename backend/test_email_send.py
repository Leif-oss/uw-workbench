"""Test email sending for a new user."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.email import send_welcome_email, SMTP_USER, SMTP_PASSWORD, FRONTEND_URL
import os

def test_email():
    print("SMTP Configuration:")
    print(f"  SMTP_USER: {'SET' if SMTP_USER else 'NOT SET'}")
    print(f"  SMTP_PASSWORD: {'SET' if SMTP_PASSWORD else 'NOT SET'}")
    print(f"  FRONTEND_URL: {FRONTEND_URL}")
    print()
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("WARNING: SMTP is not configured!")
        print("  Emails will not be sent. They will only be logged.")
        print("  To configure SMTP, set these environment variables:")
        print("    SMTP_HOST (default: smtp.gmail.com)")
        print("    SMTP_PORT (default: 587)")
        print("    SMTP_USER (your email)")
        print("    SMTP_PASSWORD (your app password)")
        print("    SMTP_FROM_EMAIL (defaults to SMTP_USER)")
        print("    SMTP_FROM_NAME (defaults to 'UW Workbench')")
        print()
        print("For local development, you can:")
        print("  1. Set up SMTP credentials in backend/.env")
        print("  2. Or check the backend logs for the set-password link")
        return False
    
    # Test sending an email
    test_email_address = input("Enter test email address (or press Enter to skip): ").strip()
    if not test_email_address:
        print("Skipping test email send.")
        return True
    
    print(f"\nSending test welcome email to {test_email_address}...")
    set_password_link = f"{FRONTEND_URL}/set-password?token=test_token_12345"
    result = send_welcome_email(
        to_email=test_email_address,
        username="testuser",
        set_password_link=set_password_link
    )
    
    if result:
        print("SUCCESS: Test email sent!")
    else:
        print("FAILED: Test email could not be sent. Check SMTP configuration and logs.")
    
    return result

if __name__ == "__main__":
    test_email()



