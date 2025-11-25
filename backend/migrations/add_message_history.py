"""
Migration: Add message_history column to projects table
Date: 2025-01-24
"""

from sqlalchemy import text
from config.database import engine

def upgrade():
    """Add message_history column"""
    with engine.connect() as conn:
        # Add message_history column (JSON array)
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS message_history JSON;
        """))
        conn.commit()
        print("✓ Added message_history column to projects table")

def downgrade():
    """Remove message_history column"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE projects
            DROP COLUMN IF EXISTS message_history;
        """))
        conn.commit()
        print("✓ Removed message_history column from projects table")

if __name__ == "__main__":
    print("Running migration: add_message_history")
    upgrade()
    print("Migration completed successfully!")
