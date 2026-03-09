"""
Test script to verify email configuration.
Run this to check if SMTP settings are correct.
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir.parent))

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        # Try project root
        project_root = backend_dir.parent
        env_path = project_root / ".env"
        if env_path.exists():
            load_dotenv(env_path)
except ImportError:
    pass

from services.email import send_welcome_email, SMTP_USER, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT

def test_email_config():
    """Test email configuration and send a test email."""
    print("=" * 60)
    print("Email Configuration Test")
    print("=" * 60)
    print()
    
    print("SMTP Configuration:")
    print(f"  Host: {SMTP_HOST}")
    print(f"  Port: {SMTP_PORT}")
    print(f"  User: {SMTP_USER if SMTP_USER else '(not set)'}")
    print(f"  Password: {'*' * len(SMTP_PASSWORD) if SMTP_PASSWORD else '(not set)'}")
    print()
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️  WARNING: SMTP_USER or SMTP_PASSWORD not configured!")
        print()
        print("To configure email:")
        print("1. Edit backend/.env file")
        print("2. Add the following variables:")
        print("   SMTP_HOST=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USER=your-email@gmail.com")
        print("   SMTP_PASSWORD=your-app-password")
        print("   SMTP_FROM_EMAIL=your-email@gmail.com")
        print("   SMTP_FROM_NAME=UW Workbench")
        print("   FRONTEND_URL=http://localhost:5173")
        print()
        print("For Gmail, you need to:")
        print("- Enable 2-Step Verification")
        print("- Generate an App Password at: https://myaccount.google.com/apppasswords")
        print()
        print("See SMTP_SETUP.md for detailed instructions.")
        return False
    
    # Test sending email
    test_email = input("Enter email address to send test email to (or press Enter to skip): ").strip()
    if not test_email:
        print("Skipping test email send.")
        return True
    
    print()
    print(f"Sending test email to {test_email}...")
    
    test_link = "http://localhost:5173/set-password?token=test-token-12345"
    success = send_welcome_email(
        to_email=test_email,
        username="testuser",
        set_password_link=test_link
    )
    
    if success:
        print("✅ Test email sent successfully!")
        print(f"   Check inbox at: {test_email}")
        return True
    else:
        print("❌ Failed to send test email.")
        print("   Check the error messages above and verify SMTP settings.")
        return False

if __name__ == "__main__":
    try:
        test_email_config()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)



