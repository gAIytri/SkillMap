"""
Migration: Add PDF Caching and Generation Status Fields

Purpose: Enable smart PDF caching and non-blocking PDF generation
         for improved performance and UX

Fields Added:
- cached_pdf: Store generated PDF bytes
- cached_pdf_hash: SHA256 hash for cache validation
- cached_pdf_generated_at: Timestamp of cache
- pdf_generating: Flag for background generation
- pdf_generation_progress: Progress message
- pdf_generation_started_at: Generation start time

Run this migration:
    cd backend
    source venv/bin/activate
    python migrations/add_pdf_caching_fields.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import engine
from sqlalchemy import text

def upgrade():
    """
    Add PDF caching and generation status fields to projects table
    """
    with engine.connect() as conn:
        print("Starting migration: add_pdf_caching_fields")

        # Add PDF caching fields
        print("1. Adding cached_pdf column...")
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS cached_pdf BYTEA NULL;
        """))
        conn.commit()
        print("   ✓ cached_pdf added")

        print("2. Adding cached_pdf_hash column...")
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS cached_pdf_hash VARCHAR(64) NULL;
        """))
        conn.commit()
        print("   ✓ cached_pdf_hash added")

        print("3. Adding cached_pdf_generated_at column...")
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS cached_pdf_generated_at TIMESTAMP WITH TIME ZONE NULL;
        """))
        conn.commit()
        print("   ✓ cached_pdf_generated_at added")

        # Add PDF generation status fields
        print("4. Adding pdf_generating column...")
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS pdf_generating BOOLEAN NOT NULL DEFAULT FALSE;
        """))
        conn.commit()
        print("   ✓ pdf_generating added")

        print("5. Adding pdf_generation_progress column...")
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS pdf_generation_progress VARCHAR(100) NULL;
        """))
        conn.commit()
        print("   ✓ pdf_generation_progress added")

        print("6. Adding pdf_generation_started_at column...")
        conn.execute(text("""
            ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS pdf_generation_started_at TIMESTAMP WITH TIME ZONE NULL;
        """))
        conn.commit()
        print("   ✓ pdf_generation_started_at added")

        # Create index on hash for faster lookups
        print("7. Creating index on cached_pdf_hash...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_projects_cached_pdf_hash
            ON projects(cached_pdf_hash);
        """))
        conn.commit()
        print("   ✓ Index created")

        print("\n✅ Migration completed successfully!")
        print("   PDF caching and generation status fields added to projects table.\n")

def downgrade():
    """
    Remove PDF caching and generation status fields
    """
    with engine.connect() as conn:
        print("Reverting migration: add_pdf_caching_fields")

        # Drop index
        print("1. Dropping index...")
        conn.execute(text("""
            DROP INDEX IF EXISTS idx_projects_cached_pdf_hash;
        """))
        conn.commit()

        # Drop columns
        print("2. Dropping columns...")
        conn.execute(text("""
            ALTER TABLE projects
            DROP COLUMN IF EXISTS cached_pdf,
            DROP COLUMN IF EXISTS cached_pdf_hash,
            DROP COLUMN IF EXISTS cached_pdf_generated_at,
            DROP COLUMN IF EXISTS pdf_generating,
            DROP COLUMN IF EXISTS pdf_generation_progress,
            DROP COLUMN IF EXISTS pdf_generation_started_at;
        """))
        conn.commit()

        print("\n✅ Migration reverted successfully!\n")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Add PDF Caching and Generation Status Fields Migration")
    print("="*60 + "\n")

    try:
        upgrade()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("   Please check your database connection and try again.\n")
        raise
