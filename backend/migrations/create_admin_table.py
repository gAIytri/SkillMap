"""
Migration script to create admins table for admin dashboard authentication
Creates admins table with:
- id (integer, primary key)
- email (string, unique)
- password_hash (string)
- full_name (string)
- is_super_admin (boolean, default False)
- is_active (boolean, default True)
- created_at (timestamp)
- updated_at (timestamp)
- last_login (timestamp, nullable)

Run with: python migrations/create_admin_table.py
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


def check_table_exists(table_name: str) -> bool:
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def migrate():
    """Run migration to create admins table"""
    logger.info("Starting admin table migration...")

    with engine.connect() as connection:
        # Start transaction
        trans = connection.begin()

        try:
            # Check if admins table already exists
            if check_table_exists('admins'):
                logger.info("✓ Admins table already exists")
                return

            logger.info("Creating 'admins' table...")

            # Create admins table
            connection.execute(text("""
                CREATE TABLE admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    is_super_admin BOOLEAN NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
            """))

            logger.info("✓ Admins table created successfully")

            # Create indexes for faster lookups
            logger.info("Creating indexes on admins table...")

            connection.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_admins_email ON admins(email)"
            ))

            logger.info("✓ Indexes created successfully")

            # Commit the transaction
            trans.commit()
            logger.info("✓ Transaction committed successfully")
            logger.info("✅ Admin table migration completed successfully!")
            logger.info("")
            logger.info("💡 Next step: Create your first admin user using the API endpoint:")
            logger.info("   POST /api/admin/register")
            logger.info("   (Note: First admin must be created manually via database or script)")

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
