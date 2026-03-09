"""
Email service for sending notifications, password resets, etc.
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env from backend directory or project root
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(backend_dir, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        # Try project root
        project_root = os.path.dirname(backend_dir)
        env_path = os.path.join(project_root, ".env")
        if os.path.exists(env_path):
            load_dotenv(env_path)
except ImportError:
    # python-dotenv not installed, will use system environment variables only
    pass

logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()  # Strip whitespace to prevent DNS errors
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))  # 587 for STARTTLS, 465 for SSL/TLS
SMTP_USER = os.getenv("SMTP_USER", "").strip() if os.getenv("SMTP_USER") else ""
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip() if os.getenv("SMTP_PASSWORD") else ""  # Strip whitespace to prevent auth failures
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER).strip() if os.getenv("SMTP_FROM_EMAIL") else SMTP_USER
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "UW Workbench").strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Note: Port 25 is blocked on Google Cloud. Use:
# - Port 587 with STARTTLS (recommended)
# - Port 465 with SSL/TLS (alternative)


def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body_html: HTML body content
        body_text: Plain text body content (optional, auto-generated if not provided)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    # If SMTP not configured, log and skip (for development)
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(
            f"Email not configured - SMTP_USER or SMTP_PASSWORD not set. "
            f"Would send email to {to_email}: {subject}"
        )
        logger.warning(
            f"SMTP configuration check - HOST: {SMTP_HOST}, PORT: {SMTP_PORT}, "
            f"USER: {'SET' if SMTP_USER else 'NOT SET'}, PASSWORD: {'SET' if SMTP_PASSWORD else 'NOT SET'}"
        )
        logger.info(f"Email content: {body_text or body_html}")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg['To'] = to_email
        
        # Create plain text version if not provided
        if not body_text:
            import re
            # Simple HTML to text conversion
            body_text = re.sub(r'<[^>]+>', '', body_html)
            body_text = body_text.replace('&nbsp;', ' ')
            body_text = body_text.strip()
        
        # Attach both versions
        part1 = MIMEText(body_text, 'plain')
        part2 = MIMEText(body_html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email with timeout and better error handling
        import socket
        try:
            # Test DNS resolution first
            socket.gethostbyname(SMTP_HOST)
        except socket.gaierror as dns_error:
            logger.error(f"DNS resolution failed for SMTP_HOST '{SMTP_HOST}': {dns_error}")
            logger.error(f"Email not sent to {to_email}: {subject}")
            return False
        
        # Send email with timeout
        # Port 465 uses SSL/TLS directly, port 587 uses STARTTLS
        # Log password length (but not actual password) for debugging
        logger.info(f"Attempting SMTP connection to {SMTP_HOST}:{SMTP_PORT} as user {SMTP_USER} (password length: {len(SMTP_PASSWORD)} chars)")
        if SMTP_PORT == 465:
            # Use SSL/TLS for port 465
            logger.info(f"Connecting to {SMTP_HOST}:{SMTP_PORT} using SSL/TLS")
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # Use STARTTLS for port 587 (or other ports)
            logger.info(f"Connecting to {SMTP_HOST}:{SMTP_PORT} using STARTTLS")
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}: {subject}")
        return True
        
    except socket.gaierror as dns_error:
        logger.error(f"DNS resolution failed for SMTP_HOST '{SMTP_HOST}': {dns_error}")
        logger.error(f"Email not sent to {to_email}: {subject}")
        return False
    except smtplib.SMTPException as smtp_error:
        logger.error(f"SMTP error sending email to {to_email}: {smtp_error}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def send_password_reset_email(
    to_email: str,
    username: str,
    reset_token: str,
    reset_url: Optional[str] = None
) -> bool:
    """
    Send password reset email with reset link.
    
    Args:
        to_email: User's email address
        username: Username
        reset_token: Password reset token
        reset_url: Optional custom reset URL (defaults to frontend reset page)
    
    Returns:
        True if email sent successfully
    """
    if not reset_url:
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    subject = "Password Reset Request - UW Workbench"
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello {username},</p>
            <p>We received a request to reset your password for your UW Workbench account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">{reset_url}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email or contact support.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                This is an automated message from UW Workbench. Please do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
Password Reset Request - UW Workbench

Hello {username},

We received a request to reset your password for your UW Workbench account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email or contact support.

This is an automated message from UW Workbench.
    """
    
    return send_email(to_email, subject, html_body, text_body)


def send_welcome_email(
    to_email: str,
    username: str,
    temporary_password: Optional[str] = None,
    set_password_link: Optional[str] = None
) -> bool:
    """
    Send welcome email to new user.
    
    Args:
        to_email: User's email address
        username: Username
        temporary_password: Optional temporary password (if provided, user uses this to login)
        set_password_link: Optional link to set password (if provided, user sets password via link)
    
    Returns:
        True if email sent successfully
    """
    subject = "Welcome to UW Workbench"
    
    password_section = ""
    if set_password_link:
        password_section = f"""
            <p>To get started, please set your password by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{set_password_link}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Set Your Password
                </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">{set_password_link}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
        """
    elif temporary_password:
        password_section = f"""
            <p><strong>Your temporary password:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-size: 14px;">{temporary_password}</code></p>
            <p>Please use this password to login. You will be asked to change it after your first login for security.</p>
        """
    else:
        password_section = """
            <p>Please contact your administrator to receive your login credentials.</p>
        """
    
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Welcome to UW Workbench!</h2>
            <p>Hello {username},</p>
            <p>Your account has been created successfully.</p>
            {password_section}
            <p>You can access the application at: <a href="{FRONTEND_URL}">{FRONTEND_URL}</a></p>
            <p>Your username is: <strong>{username}</strong></p>
            <p>If you have any questions, please contact your administrator.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
                This is an automated message from UW Workbench. Please do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
Welcome to UW Workbench!

Hello {username},

Your account has been created successfully.

{"To get started, please set your password by visiting: " + set_password_link if set_password_link else ""}
{"Your temporary password: " + temporary_password + " (Please change after first login)" if temporary_password else ""}
{"Please contact your administrator to receive your login credentials." if not set_password_link and not temporary_password else ""}

You can access the application at: {FRONTEND_URL}
Your username is: {username}

If you have any questions, please contact your administrator.

This is an automated message from UW Workbench.
    """
    
    return send_email(to_email, subject, html_body, text_body)

