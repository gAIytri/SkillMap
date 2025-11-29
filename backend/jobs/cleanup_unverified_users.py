"""
Cleanup Job for Unverified Users

This job runs daily to delete user accounts that:
- Have NOT verified their email (email_verified = False)
- Were created more than 30 days ago

This prevents database bloat from abandoned signups, fake emails, and typos.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy import and_
import logging

from config.database import SessionLocal
from models.user import User

logger = logging.getLogger(__name__)


def cleanup_unverified_users():
    """
    Delete unverified users older than 30 days.

    This job should be run daily (e.g., via cron or APScheduler).

    Returns:
        int: Number of users deleted
    """
    db = SessionLocal()
    try:
        # Calculate cutoff date (30 days ago)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

        # Find unverified users older than cutoff
        users_to_delete = db.query(User).filter(
            and_(
                User.email_verified == False,
                User.created_at < cutoff_date
            )
        ).all()

        # Log users being deleted
        if users_to_delete:
            logger.info(f"🧹 Found {len(users_to_delete)} unverified users older than 30 days")
            for user in users_to_delete:
                logger.debug(f"   Deleting: {user.email} (created: {user.created_at})")

        # Delete users
        deleted_count = db.query(User).filter(
            and_(
                User.email_verified == False,
                User.created_at < cutoff_date
            )
        ).delete(synchronize_session=False)

        db.commit()

        if deleted_count > 0:
            logger.info(f"✅ Successfully deleted {deleted_count} unverified users")
        else:
            logger.info("✅ No unverified users to clean up")

        return deleted_count

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to cleanup unverified users: {e}")
        raise
    finally:
        db.close()


def run_cleanup_job():
    """
    Wrapper function to run the cleanup job with error handling.
    Can be called from a scheduler or cron job.
    """
    try:
        logger.info("🚀 Starting unverified users cleanup job...")
        deleted = cleanup_unverified_users()
        logger.info(f"🏁 Cleanup job completed. Deleted {deleted} users.")
        return deleted
    except Exception as e:
        logger.error(f"🔥 Cleanup job failed: {e}")
        return 0


# For testing/manual execution
if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("Running unverified users cleanup job...")
    deleted = run_cleanup_job()
    print(f"Deleted {deleted} unverified users.")
