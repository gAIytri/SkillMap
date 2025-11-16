"""
Migration script to add credits system to existing database
Adds:
- credits column to users table (default 100.0)
- credit_transactions table

Run with: python migrations/add_credits_system.py
"""

import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from config.database import engine, init_db
from models import User, CreditTransaction
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
    """Run migration to add credits system"""
    logger.info("Starting credits system migration...")

    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()

        try:
            # Check if users table exists
            if not check_table_exists('users'):
                logger.error("Users table does not exist! Please initialize database first.")
                return

            # 1. Add credits column to users table if it doesn't exist
            if not check_column_exists('users', 'credits'):
                logger.info("Adding 'credits' column to users table...")
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN credits REAL NOT NULL DEFAULT 100.0"
                ))
                logger.info("✓ 'credits' column added successfully")
            else:
                logger.info("✓ 'credits' column already exists")

            # 2. Update existing users to have 100 credits if they have NULL or 0
            logger.info("Updating existing users with 100 credits...")
            result = connection.execute(text(
                "UPDATE users SET credits = 100.0 WHERE credits IS NULL OR credits = 0"
            ))
            logger.info(f"✓ Updated {result.rowcount} users with default credits")

            # Commit the transaction
            trans.commit()
            logger.info("✓ Transaction committed successfully")

        except Exception as e:
            trans.rollback()
            logger.error(f"✗ Migration failed: {e}")
            raise

    # 3. Create credit_transactions table using SQLAlchemy
    logger.info("Creating credit_transactions table if it doesn't exist...")
    if not check_table_exists('credit_transactions'):
        # Use init_db to create all tables (including credit_transactions)
        init_db()
        logger.info("✓ credit_transactions table created successfully")
    else:
        logger.info("✓ credit_transactions table already exists")

    logger.info("✅ Migration completed successfully!")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)
