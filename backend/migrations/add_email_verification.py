"""
Migration: Add email verification fields to users table
Date: 2025-01-24
Description: Adds email_verified, verification_token, verification_token_expires, and verification_link_token fields
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import config
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import text
from config.database import engine


def upgrade():
    """Add email verification columns to users table"""
    print("🔄 Starting migration: add_email_verification")

    with engine.connect() as conn:
        # Add email_verified column
        print("  → Adding email_verified column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
        """))

        # Add verification_token column
        print("  → Adding verification_token column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS verification_token VARCHAR(6)
        """))

        # Add verification_token_expires column
        print("  → Adding verification_token_expires column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE
        """))

        # Add verification_link_token column
        print("  → Adding verification_link_token column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS verification_link_token VARCHAR(64) UNIQUE
        """))

        # Create index on verification_link_token
        print("  → Creating index on verification_link_token...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_users_verification_link_token
            ON users(verification_link_token)
        """))

        # Set existing users (Google OAuth) as verified
        print("  → Setting existing Google OAuth users as verified...")
        conn.execute(text("""
            UPDATE users
            SET email_verified = TRUE
            WHERE google_id IS NOT NULL
        """))

        conn.commit()

    print("✅ Migration completed successfully!")


def downgrade():
    """Remove email verification columns from users table"""
    print("🔄 Rolling back migration: add_email_verification")

    with engine.connect() as conn:
        print("  → Dropping index on verification_link_token...")
        conn.execute(text("DROP INDEX IF EXISTS idx_users_verification_link_token"))

        print("  → Removing email verification columns...")
        conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS email_verified"))
        conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS verification_token"))
        conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expires"))
        conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS verification_link_token"))

        conn.commit()

    print("✅ Rollback completed successfully!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "downgrade":
        downgrade()
    else:
        upgrade()
