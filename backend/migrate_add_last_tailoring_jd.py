"""
Migration: Add last_tailoring_jd column to projects table

Run this script to add the new column for tracking the last JD used for tailoring.

Usage:
    python migrate_add_last_tailoring_jd.py
"""

from sqlalchemy import create_engine, text
from config.settings import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Add last_tailoring_jd column to projects table"""

    logger.info("Starting migration: Add last_tailoring_jd column")

    # Create engine
    engine = create_engine(settings.DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("PRAGMA table_info(projects)"))
            columns = [row[1] for row in result]

            if 'last_tailoring_jd' in columns:
                logger.info("Column 'last_tailoring_jd' already exists. Skipping migration.")
                return

            # Add the new column
            logger.info("Adding column 'last_tailoring_jd' to projects table...")
            conn.execute(text("""
                ALTER TABLE projects
                ADD COLUMN last_tailoring_jd TEXT NULL
            """))
            conn.commit()

            logger.info("✅ Migration completed successfully!")
            logger.info("Column 'last_tailoring_jd' added to projects table")

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise
    finally:
        engine.dispose()


if __name__ == "__main__":
    run_migration()
