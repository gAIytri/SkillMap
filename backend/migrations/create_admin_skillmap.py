"""
Create the first admin user for SkillMap
Email: admin@skillmap.com
Password: adminpass123
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_admin():
    """Create the first super admin user"""
    logger.info("=== Creating SkillMap Admin ===")

    email = "admin@skillmap.com"
    full_name = "SkillMap Admin"
    password = "adminpass123"

    # Create database session
    db: Session = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.email == email).first()
        if existing_admin:
            logger.info(f"✓ Admin with email '{email}' already exists")
            logger.info(f"   ID: {existing_admin.id}")
            logger.info(f"   Name: {existing_admin.full_name}")
            logger.info(f"   Super Admin: {existing_admin.is_super_admin}")
            return

        # Create new admin
        hashed_password = hash_password(password)
        new_admin = Admin(
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            is_super_admin=True,  # First admin is super admin
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
        logger.info(f"   Password: adminpass123")
        logger.info("")
        logger.info("🔐 Login at: /admin/login")
        logger.info("   Email: admin@skillmap.com")
        logger.info("   Password: adminpass123")

    except Exception as e:
        db.rollback()
        logger.error(f"✗ Failed to create admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        create_admin()
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)
