"""
Migration: Add version_history and current_versions fields to projects table

This migration adds the new version system fields to support permanent version storage
with fixed version numbers that never change.

Run this script from the backend directory:
    cd backend
    source venv/bin/activate
    python migrations/add_version_system.py
"""

import sys
import os
import json

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine

def migrate():
    print("🚀 Starting migration: add_version_system")

    with engine.connect() as conn:
        # Add version_history column
        print("📝 Adding version_history column...")
        try:
            conn.execute(text("""
                ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS version_history JSONB
            """))
            conn.commit()
            print("✅ version_history column added")
        except Exception as e:
            print(f"⚠️  version_history column might already exist: {e}")

        # Add current_versions column
        print("📝 Adding current_versions column...")
        try:
            conn.execute(text("""
                ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS current_versions JSONB
            """))
            conn.commit()
            print("✅ current_versions column added")
        except Exception as e:
            print(f"⚠️  current_versions column might already exist: {e}")

        # Initialize existing projects with version 0
        print("📝 Initializing existing projects with version 0...")
        try:
            # Get all projects that need initialization
            result = conn.execute(text("""
                SELECT id, resume_json FROM projects
                WHERE version_history IS NULL OR current_versions IS NULL
            """))

            projects = result.fetchall()
            print(f"Found {len(projects)} projects to initialize")

            for project in projects:
                project_id, resume_json = project

                if resume_json:
                    # Initialize version_history with version 0 for each section
                    version_history = {
                        "professional_summary": {"0": resume_json.get("professional_summary")},
                        "experience": {"0": resume_json.get("experience")},
                        "projects": {"0": resume_json.get("projects")},
                        "skills": {"0": resume_json.get("skills")}
                    }

                    # Initialize current_versions to point to version 0
                    current_versions = {
                        "professional_summary": 0,
                        "experience": 0,
                        "projects": 0,
                        "skills": 0
                    }

                    # Update project (convert dicts to JSON strings for PostgreSQL)
                    conn.execute(
                        text("""
                            UPDATE projects
                            SET version_history = CAST(:version_history AS jsonb),
                                current_versions = CAST(:current_versions AS jsonb)
                            WHERE id = :project_id
                        """),
                        {
                            "version_history": json.dumps(version_history),
                            "current_versions": json.dumps(current_versions),
                            "project_id": project_id
                        }
                    )

            conn.commit()
            print(f"✅ Initialized {len(projects)} projects with version 0")

        except Exception as e:
            print(f"❌ Error initializing projects: {e}")
            conn.rollback()
            raise

    print("✅ Migration completed successfully!")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
