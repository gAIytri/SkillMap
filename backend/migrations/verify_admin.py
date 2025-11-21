"""
Verify admin exists in Neon database
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from config.database import SessionLocal
from models.admin import Admin
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_admin():
    """Verify admin exists in database"""
    logger.info("=== Verifying Admin in Neon DB ===")
    logger.info("")

    db: Session = SessionLocal()

    try:
        # Query all admins
        admins = db.query(Admin).all()

        if not admins:
            logger.warning("⚠️  No admins found in database!")
            return

        logger.info(f"✅ Found {len(admins)} admin(s) in database:")
        logger.info("")

        for admin in admins:
            logger.info(f"   Admin ID: {admin.id}")
            logger.info(f"   Email: {admin.email}")
            logger.info(f"   Name: {admin.full_name}")
            logger.info(f"   Super Admin: {admin.is_super_admin}")
            logger.info(f"   Active: {admin.is_active}")
            logger.info(f"   Created: {admin.created_at}")
            logger.info(f"   Last Login: {admin.last_login or 'Never'}")
            logger.info("   " + "-" * 50)

        logger.info("")
        logger.info("✅ Admin verification complete!")

    except Exception as e:
        logger.error(f"✗ Failed to verify admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        verify_admin()
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        sys.exit(1)
