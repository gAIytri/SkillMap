"""
Migration script to add auto-recharge functionality
Adds to users table:
- auto_recharge_enabled (boolean, default False)
- auto_recharge_credits (integer, nullable)
- auto_recharge_threshold (float, default 10.0)
- stripe_customer_id (string, nullable)
- stripe_payment_method_id (string, nullable)

Run with: python migrations/add_auto_recharge.py
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
    """Run migration to add auto-recharge fields"""
    logger.info("Starting auto-recharge migration...")

    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()

        try:
            # Check if users table exists
            if not check_table_exists('users'):
                logger.error("Users table does not exist! Please initialize database first.")
                return

            # 1. Add auto_recharge_enabled column
            if not check_column_exists('users', 'auto_recharge_enabled'):
                logger.info("Adding 'auto_recharge_enabled' column to users table...")
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN auto_recharge_enabled BOOLEAN NOT NULL DEFAULT FALSE"
                ))
                logger.info("✓ 'auto_recharge_enabled' column added successfully")
            else:
                logger.info("✓ 'auto_recharge_enabled' column already exists")

            # 2. Add auto_recharge_credits column
            if not check_column_exists('users', 'auto_recharge_credits'):
                logger.info("Adding 'auto_recharge_credits' column to users table...")
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN auto_recharge_credits INTEGER"
                ))
                logger.info("✓ 'auto_recharge_credits' column added successfully")
            else:
                logger.info("✓ 'auto_recharge_credits' column already exists")

            # 3. Add auto_recharge_threshold column
            if not check_column_exists('users', 'auto_recharge_threshold'):
                logger.info("Adding 'auto_recharge_threshold' column to users table...")
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN auto_recharge_threshold REAL NOT NULL DEFAULT 10.0"
                ))
                logger.info("✓ 'auto_recharge_threshold' column added successfully")
            else:
                logger.info("✓ 'auto_recharge_threshold' column already exists")

            # 4. Add stripe_customer_id column with index
            if not check_column_exists('users', 'stripe_customer_id'):
                logger.info("Adding 'stripe_customer_id' column to users table...")
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255)"
                ))
                # Create index
                connection.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_users_stripe_customer_id ON users(stripe_customer_id)"
                ))
                logger.info("✓ 'stripe_customer_id' column and index added successfully")
            else:
                logger.info("✓ 'stripe_customer_id' column already exists")

            # 5. Add stripe_payment_method_id column
            if not check_column_exists('users', 'stripe_payment_method_id'):
                logger.info("Adding 'stripe_payment_method_id' column to users table...")
                connection.execute(text(
                    "ALTER TABLE users ADD COLUMN stripe_payment_method_id VARCHAR(255)"
                ))
                logger.info("✓ 'stripe_payment_method_id' column added successfully")
            else:
                logger.info("✓ 'stripe_payment_method_id' column already exists")

            # Commit the transaction
            trans.commit()
            logger.info("✓ Transaction committed successfully")
            logger.info("✅ Auto-recharge migration completed successfully!")

        except Exception as e:
            trans.rollback()
            logger.error(f"✗ Migration failed: {e}")
            raise


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)
