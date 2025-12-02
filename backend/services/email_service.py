"""
Email Service using Resend
Handles sending verification emails with 6-digit codes and magic links
"""

import os
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import resend
from config.settings import settings

# Get configuration from settings
FRONTEND_URL = settings.FRONTEND_URL
FROM_EMAIL = settings.FROM_EMAIL

# Initialize Resend with API key from settings
resend.api_key = settings.RESEND_API_KEY


def generate_verification_code() -> str:
    """Generate a random 6-digit verification code"""
    return str(random.randint(100000, 999999))


def generate_verification_link_token() -> str:
    """Generate a unique token for magic link"""
    return str(uuid.uuid4())


def get_verification_expiry() -> datetime:
    """Get expiry time for verification token (10 minutes from now)"""
    return datetime.now(timezone.utc) + timedelta(minutes=10)


def send_verification_email(
    email: str,
    full_name: str,
    verification_code: str,
    verification_link_token: str
) -> bool:
    """
    Send verification email with both 6-digit code and magic link

    Args:
        email: Recipient email address
        full_name: User's full name
        verification_code: 6-digit verification code
        verification_link_token: UUID token for magic link

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Construct magic link
        magic_link = f"{FRONTEND_URL}/verify-email/{verification_link_token}"

        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - SkillMap</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">

                            <!-- Header with gradient -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #C8E6DC 0%, #F5F5F5 100%); padding: 40px 40px 30px 40px; text-align: center;">
                                    <h1 style="margin: 0; color: #072D1F; font-size: 32px; font-weight: 700;">SkillMap</h1>
                                    <p style="margin: 10px 0 0 0; color: #29B770; font-size: 16px; font-weight: 600;">AI-Powered Resume Tailoring</p>
                                </td>
                            </tr>

                            <!-- Main content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="margin: 0 0 20px 0; color: #072D1F; font-size: 24px; font-weight: 600;">Welcome, {full_name}! 👋</h2>

                                    <p style="margin: 0 0 25px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                        Thank you for signing up! To get started with SkillMap, please verify your email address.
                                    </p>

                                    <!-- Verification code box -->
                                    <div style="background: linear-gradient(135deg, #072D1F 0%, #29B770 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                                        <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">YOUR VERIFICATION CODE</p>
                                        <p style="margin: 0; color: #FFFFFF; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{verification_code}</p>
                                        <p style="margin: 15px 0 0 0; color: #C8E6DC; font-size: 13px;">Expires in 10 minutes</p>
                                    </div>

                                    <!-- OR divider -->
                                    <div style="text-align: center; margin: 30px 0; position: relative;">
                                        <div style="border-top: 1px solid #E0E0E0;"></div>
                                        <span style="background: #FFFFFF; padding: 0 15px; position: relative; top: -12px; color: #999999; font-size: 14px;">OR</span>
                                    </div>

                                    <!-- Magic link button -->
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="{magic_link}" style="display: inline-block; background-color: #29B770; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 8px rgba(41, 183, 112, 0.3);">
                                            Verify Email with One Click
                                        </a>
                                    </div>

                                    <!-- Security notice -->
                                    <div style="background-color: #FFF9E6; border-left: 4px solid #FFB800; padding: 15px; margin: 30px 0; border-radius: 4px;">
                                        <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                                            <strong>🔒 Security Tip:</strong> If you didn't create a SkillMap account, please ignore this email. Your account will not be activated.
                                        </p>
                                    </div>

                                    <!-- Help text -->
                                    <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                        Need help? Contact us at <a href="mailto:admin@gaiytri.com" style="color: #29B770; text-decoration: none;">admin@gaiytri.com</a>
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #F9F9F9; padding: 30px 40px; text-align: center; border-top: 1px solid #E0E0E0;">
                                    <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                                        © {datetime.now().year} SkillMap. All rights reserved.
                                    </p>
                                    <p style="margin: 0; color: #BBBBBB; font-size: 12px;">
                                        This email was sent to {email}
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        # Plain text fallback
        text_content = f"""
        Welcome to SkillMap, {full_name}!

        Your verification code is: {verification_code}

        Or click this link to verify: {magic_link}

        This code expires in 10 minutes.

        If you didn't create a SkillMap account, please ignore this email.

        Need help? Contact us at admin@gaiytri.com

        © {datetime.now().year} SkillMap. All rights reserved.
        """

        # Send email via Resend
        params = {
            "from": FROM_EMAIL,
            "to": [email],
            "subject": "Verify your email - SkillMap",
            "html": html_content,
            "text": text_content,
        }

        response = resend.Emails.send(params)
        print(f"✅ Verification email sent to {email} (ID: {response.get('id')})")
        return True

    except Exception as e:
        print(f"❌ Failed to send verification email to {email}: {str(e)}")
        return False


def send_welcome_email(email: str, full_name: str) -> bool:
    """
    Send welcome email after successful verification

    Args:
        email: Recipient email address
        full_name: User's full name

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to SkillMap!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">

                            <tr>
                                <td style="background: linear-gradient(135deg, #072D1F 0%, #29B770 100%); padding: 40px; text-align: center;">
                                    <h1 style="margin: 0; color: #FFFFFF; font-size: 36px; font-weight: 700;">🎉 Welcome to SkillMap!</h1>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="margin: 0 0 20px 0; color: #072D1F; font-size: 24px; font-weight: 600;">Hi {full_name},</h2>

                                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                        Your email has been verified successfully! You're all set to start creating tailored resumes with AI.
                                    </p>

                                    <div style="background-color: #F0F9F4; border-left: 4px solid #29B770; padding: 20px; margin: 30px 0; border-radius: 4px;">
                                        <p style="margin: 0 0 15px 0; color: #072D1F; font-size: 18px; font-weight: 600;">You have 100 FREE credits! 🎁</p>
                                        <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                                            That's enough for 20 AI-tailored resumes to help you land your dream job.
                                        </p>
                                    </div>

                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="{FRONTEND_URL}/upload-resume" style="display: inline-block; background-color: #29B770; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 8px rgba(41, 183, 112, 0.3);">
                                            Upload Your Resume
                                        </a>
                                    </p>

                                    <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                        Happy tailoring!<br>
                                        The SkillMap Team
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <td style="background-color: #F9F9F9; padding: 30px 40px; text-align: center; border-top: 1px solid #E0E0E0;">
                                    <p style="margin: 0; color: #999999; font-size: 13px;">
                                        © {datetime.now().year} SkillMap. All rights reserved.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to SkillMap, {full_name}!

        Your email has been verified successfully!

        You have 100 FREE credits to get started - that's enough for 20 AI-tailored resumes!

        Get started: {FRONTEND_URL}/upload-resume

        Happy tailoring!
        The SkillMap Team

        © {datetime.now().year} SkillMap. All rights reserved.
        """

        params = {
            "from": FROM_EMAIL,
            "to": [email],
            "subject": "🎉 Welcome to SkillMap!",
            "html": html_content,
            "text": text_content,
        }

        response = resend.Emails.send(params)
        print(f"✅ Welcome email sent to {email} (ID: {response.get('id')})")
        return True

    except Exception as e:
        print(f"❌ Failed to send welcome email to {email}: {str(e)}")
        return False


def send_password_reset_email(email: str, full_name: str, reset_code: str) -> bool:
    """
    Send password reset email with 6-digit code

    Args:
        email: Recipient email address
        full_name: User's full name
        reset_code: 6-digit reset code

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # HTML email template
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - SkillMap</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">

                            <!-- Header with gradient -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #C8E6DC 0%, #F5F5F5 100%); padding: 40px 40px 30px 40px; text-align: center;">
                                    <h1 style="margin: 0; color: #072D1F; font-size: 32px; font-weight: 700;">SkillMap</h1>
                                    <p style="margin: 10px 0 0 0; color: #29B770; font-size: 16px; font-weight: 600;">AI-Powered Resume Tailoring</p>
                                </td>
                            </tr>

                            <!-- Main content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="margin: 0 0 20px 0; color: #072D1F; font-size: 24px; font-weight: 600;">Password Reset Request</h2>

                                    <p style="margin: 0 0 25px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                        Hi {full_name}, we received a request to reset your password. Use the code below to reset it:
                                    </p>

                                    <!-- Reset code box -->
                                    <div style="background: linear-gradient(135deg, #072D1F 0%, #29B770 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                                        <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">YOUR RESET CODE</p>
                                        <p style="margin: 0; color: #FFFFFF; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">{reset_code}</p>
                                        <p style="margin: 15px 0 0 0; color: #C8E6DC; font-size: 13px;">Expires in 10 minutes</p>
                                    </div>

                                    <!-- Security notice -->
                                    <div style="background-color: #FFF9E6; border-left: 4px solid #FFB800; padding: 15px; margin: 30px 0; border-radius: 4px;">
                                        <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.6;">
                                            <strong>🔒 Security Tip:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                                        </p>
                                    </div>

                                    <!-- Help text -->
                                    <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                        Need help? Contact us at <a href="mailto:admin@gaiytri.com" style="color: #29B770; text-decoration: none;">admin@gaiytri.com</a>
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #F9F9F9; padding: 30px 40px; text-align: center; border-top: 1px solid #E0E0E0;">
                                    <p style="margin: 0 0 10px 0; color: #999999; font-size: 13px;">
                                        © {datetime.now().year} SkillMap. All rights reserved.
                                    </p>
                                    <p style="margin: 0; color: #BBBBBB; font-size: 12px;">
                                        This email was sent to {email}
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        # Plain text fallback
        text_content = f"""
        Password Reset Request - SkillMap

        Hi {full_name},

        We received a request to reset your password.

        Your password reset code is: {reset_code}

        This code expires in 10 minutes.

        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

        Need help? Contact us at admin@gaiytri.com

        © {datetime.now().year} SkillMap. All rights reserved.
        """

        # Send email via Resend
        params = {
            "from": FROM_EMAIL,
            "to": [email],
            "subject": "Reset your password - SkillMap",
            "html": html_content,
            "text": text_content,
        }

        response = resend.Emails.send(params)
        print(f"✅ Password reset email sent to {email} (ID: {response.get('id')})")
        return True

    except Exception as e:
        print(f"❌ Failed to send password reset email to {email}: {str(e)}")
        return False
