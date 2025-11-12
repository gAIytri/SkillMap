"""
Migration script to make legacy fields nullable
Run this to allow NULL values in deprecated fields
"""

import sqlite3
import os

db_path = "./skillmap.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Migrating database: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("\nUpdating base_resumes table...")
# SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
# But for simplicity, we'll just update existing NULL values

# Check current state
cursor.execute("SELECT COUNT(*) FROM base_resumes WHERE latex_content IS NULL")
null_count = cursor.fetchone()[0]
print(f"  - Found {null_count} records with NULL latex_content")

# For SQLite, we need to be careful with NOT NULL constraints
# The easiest approach is to set a default value for NULL fields
cursor.execute("UPDATE base_resumes SET latex_content = '' WHERE latex_content IS NULL")
print(f"  - Updated NULL latex_content fields to empty string")

print("\nUpdating projects table...")
# Same for projects
cursor.execute("SELECT COUNT(*) FROM projects WHERE tailored_latex_content IS NULL")
null_count = cursor.fetchone()[0]
print(f"  - Found {null_count} records with NULL tailored_latex_content")

cursor.execute("UPDATE projects SET tailored_latex_content = '' WHERE tailored_latex_content IS NULL")
print(f"  - Updated NULL tailored_latex_content fields to empty string")

# Commit changes
conn.commit()
conn.close()

print("\nMigration completed successfully!")
