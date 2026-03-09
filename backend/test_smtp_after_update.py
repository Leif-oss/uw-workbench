"""Test SMTP configuration after updating .env file."""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment - force reload
try:
    from dotenv import load_dotenv
    env_path = project_root / "backend" / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=True)
except ImportError:
    pass

from backend.services.email import send_welcome_email, SMTP_USER, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT

print("=" * 60)
print("Testing SMTP Configuration")
print("=" * 60)
print(f"SMTP_HOST: {SMTP_HOST}")
print(f"SMTP_PORT: {SMTP_PORT}")
print(f"SMTP_USER: {SMTP_USER}")
print(f"SMTP_PASSWORD set: {'Yes' if SMTP_PASSWORD else 'No'} ({len(SMTP_PASSWORD) if SMTP_PASSWORD else 0} chars)")
print()

if not SMTP_USER or not SMTP_PASSWORD:
    print("[ERROR] SMTP_USER or SMTP_PASSWORD not configured!")
    print("Please update backend/.env file")
    sys.exit(1)

if "@gmail.com" not in SMTP_USER.lower():
    print(f"[WARNING] SMTP_USER ({SMTP_USER}) doesn't look like a Gmail address")
    print("Make sure you're using a Gmail account with Gmail SMTP settings")
    print()

print("Sending test email...")
print()

test_link = "http://localhost:5173/set-password?token=test-token-12345"

result = send_welcome_email(
    to_email="leifkeller@hotmail.com",  # Test recipient
    username="testuser",
    set_password_link=test_link
)

print()
if result:
    print("[SUCCESS] Email sent successfully!")
    print(f"Check the inbox for: leifkeller@hotmail.com")
    print("(Check spam folder if you don't see it)")
else:
    print("[FAILED] Email sending failed")
    print("Check the error message above for details")
    print()
    print("Common issues:")
    print("- Wrong App Password (must be 16 characters, no spaces)")
    print("- 2-Step Verification not enabled")
    print("- Using regular password instead of App Password")
    print("- Account security settings blocking the login")



