"""
Script to create the first super admin user
This is needed because the /api/admin/register endpoint requires super admin auth

Run with: python migrations/create_first_admin.py

You will be prompted for email, password, and full name.
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.admin import Admin
from utils.security import hash_password
import logging
import getpass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_first_admin():
    """Create the first super admin user"""
    logger.info("=== Create First Super Admin ===")
    logger.info("")

    # Get admin details from user input
    email = input("Enter admin email: ").strip()
    if not email:
        logger.error("Email cannot be empty")
        return

    full_name = input("Enter full name: ").strip()
    if not full_name:
        logger.error("Full name cannot be empty")
        return

    password = getpass.getpass("Enter password (min 8 characters): ").strip()
    if len(password) < 8:
        logger.error("Password must be at least 8 characters long")
        return

    password_confirm = getpass.getpass("Confirm password: ").strip()
    if password != password_confirm:
        logger.error("Passwords do not match")
        return

    # Create database session
    db: Session = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.email == email).first()
        if existing_admin:
            logger.error(f"Admin with email '{email}' already exists")
            return

        # Create new admin
        hashed_password = hash_password(password)
        new_admin = Admin(
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            is_super_admin=True,  # First admin is always super admin
            is_active=True
        )

        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        logger.info("")
        logger.info("✅ Super admin created successfully!")
        logger.info(f"   ID: {new_admin.id}")
        logger.info(f"   Email: {new_admin.email}")
        logger.info(f"   Name: {new_admin.full_name}")
        logger.info(f"   Super Admin: {new_admin.is_super_admin}")
        logger.info("")
        logger.info("🔐 You can now login at: http://localhost:5173/admin/login")
        logger.info("   (Frontend needs to be set up first)")

    except Exception as e:
        db.rollback()
        logger.error(f"✗ Failed to create admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        create_first_admin()
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)
