"""
Migration script to add cover letter and email fields to projects table
Adds:
- cover_letter_text column (TEXT, nullable)
- email_body_text column (TEXT, nullable)
- cover_letter_generated_at column (TIMESTAMP, nullable)
- email_generated_at column (TIMESTAMP, nullable)

Run with: python migrations/add_cover_letter_email.py
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from config.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def check_table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def migrate():
    """Run migration to add cover letter and email fields"""
    logger.info("Starting cover letter and email fields migration...")

    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()

        try:
            # Check if projects table exists
            if not check_table_exists('projects'):
                logger.error("Projects table does not exist! Please initialize database first.")
                return

            # 1. Add cover_letter_text column if it doesn't exist
            if not check_column_exists('projects', 'cover_letter_text'):
                logger.info("Adding 'cover_letter_text' column to projects table...")
                connection.execute(text(
                    "ALTER TABLE projects ADD COLUMN cover_letter_text TEXT"
                ))
                logger.info("✓ 'cover_letter_text' column added successfully")
            else:
                logger.info("✓ 'cover_letter_text' column already exists")

            # 2. Add email_body_text column if it doesn't exist
            if not check_column_exists('projects', 'email_body_text'):
                logger.info("Adding 'email_body_text' column to projects table...")
                connection.execute(text(
                    "ALTER TABLE projects ADD COLUMN email_body_text TEXT"
                ))
                logger.info("✓ 'email_body_text' column added successfully")
            else:
                logger.info("✓ 'email_body_text' column already exists")

            # 3. Add cover_letter_generated_at column if it doesn't exist
            if not check_column_exists('projects', 'cover_letter_generated_at'):
                logger.info("Adding 'cover_letter_generated_at' column to projects table...")
                connection.execute(text(
                    "ALTER TABLE projects ADD COLUMN cover_letter_generated_at TIMESTAMP"
                ))
                logger.info("✓ 'cover_letter_generated_at' column added successfully")
            else:
                logger.info("✓ 'cover_letter_generated_at' column already exists")

            # 4. Add email_generated_at column if it doesn't exist
            if not check_column_exists('projects', 'email_generated_at'):
                logger.info("Adding 'email_generated_at' column to projects table...")
                connection.execute(text(
                    "ALTER TABLE projects ADD COLUMN email_generated_at TIMESTAMP"
                ))
                logger.info("✓ 'email_generated_at' column added successfully")
            else:
                logger.info("✓ 'email_generated_at' column already exists")

            # Commit the transaction
            trans.commit()
            logger.info("✓ Transaction committed successfully")

        except Exception as e:
            trans.rollback()
            logger.error(f"✗ Migration failed: {e}")
            raise

    logger.info("✅ Migration completed successfully!")
    logger.info("")
    logger.info("New columns added to 'projects' table:")
    logger.info("  - cover_letter_text (TEXT)")
    logger.info("  - email_body_text (TEXT)")
    logger.info("  - cover_letter_generated_at (TIMESTAMP)")
    logger.info("  - email_generated_at (TIMESTAMP)")
    logger.info("")
    logger.info("All columns are nullable, so existing projects are unaffected.")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)
