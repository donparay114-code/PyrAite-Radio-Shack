"""Email service for sending password reset and other emails using Resend."""

import logging

import httpx

from src.utils.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(
    to_email: str,
    reset_token: str,
    user_name: str | None = None,
) -> bool:
    """
    Send a password reset email with a secure link using Resend.

    Args:
        to_email: Recipient email address
        reset_token: The password reset token
        user_name: Optional user name for personalization

    Returns:
        True if email was sent successfully, False otherwise
    """
    if not settings.resend_api_key:
        logger.warning(
            "Resend API key not configured - cannot send password reset email"
        )
        return False

    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
    display_name = user_name or "there"

    # HTML email template
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(139, 92, 246, 0.2);">
            <!-- Logo/Header -->
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">PYrte Radio</h1>
            </div>

            <!-- Content -->
            <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Reset Your Password</h2>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi {display_name},
            </p>
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                We received a request to reset your password. Click the button below to create a new password:
            </p>

            <!-- Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                    Reset Password
                </a>
            </div>

            <!-- Expiry notice -->
            <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                This link will expire in 30 minutes. If you didn't request a password reset, you can safely ignore this email.
            </p>

            <!-- Fallback link -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="color: #71717a; font-size: 12px; line-height: 1.6; margin: 0;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #8b5cf6; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                    {reset_url}
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px;">
            <p style="color: #52525b; font-size: 12px; margin: 0;">
                PYrte Radio - AI-Powered Community Radio
            </p>
        </div>
    </div>
</body>
</html>
"""

    # Plain text fallback
    text_content = f"""Reset Your Password

Hi {display_name},

We received a request to reset your password. Click the link below to create a new password:

{reset_url}

This link will expire in 30 minutes.

If you didn't request a password reset, you can safely ignore this email.

---
PYrte Radio - AI-Powered Community Radio
"""

    # Send via Resend API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{settings.resend_from_name} <{settings.resend_from_email}>",
                    "to": [to_email],
                    "subject": "Reset Your Password - PYrte Radio",
                    "html": html_content,
                    "text": text_content,
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                logger.info(f"Password reset email sent to {to_email}")
                return True
            else:
                logger.error(
                    f"Failed to send email: {response.status_code} - {response.text}"
                )
                return False
    except httpx.HTTPError as e:
        logger.error(f"HTTP error sending email to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email to {to_email}: {e}")
        return False
