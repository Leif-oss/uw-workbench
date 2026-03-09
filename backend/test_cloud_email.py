"""Test email sending in cloud environment."""
import sys
from pathlib import Path
import os

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.services.email import send_welcome_email, SMTP_USER, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT, FRONTEND_URL

def test_email():
    print("="*80)
    print("CLOUD EMAIL CONFIGURATION TEST")
    print("="*80)
    print()
    print(f"SMTP_HOST: {SMTP_HOST}")
    print(f"SMTP_PORT: {SMTP_PORT}")
    print(f"SMTP_USER: {'SET' if SMTP_USER else 'NOT SET'}")
    print(f"SMTP_PASSWORD: {'SET' if SMTP_PASSWORD else 'NOT SET'}")
    print(f"FRONTEND_URL: {FRONTEND_URL}")
    print()
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("ERROR: SMTP credentials not configured!")
        print("  The email service requires SMTP_USER and SMTP_PASSWORD to be set.")
        print("  In cloud, these should come from Google Secret Manager.")
        return False
    
    print("SMTP credentials are configured.")
    print("Testing email send...")
    
    # Test sending an email
    test_email_address = os.getenv("TEST_EMAIL", "leif@deanshomer.com")
    result = send_welcome_email(
        to_email=test_email_address,
        username="testuser",
        set_password_link=f"{FRONTEND_URL}/set-password?token=test_token_123"
    )
    
    if result:
        print(f"SUCCESS: Test email sent to {test_email_address}")
    else:
        print(f"FAILED: Could not send test email to {test_email_address}")
        print("  Check SMTP configuration and logs for errors.")
    
    return result

if __name__ == "__main__":
    test_email()



