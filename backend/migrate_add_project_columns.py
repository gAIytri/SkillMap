"""
Migration script to add new columns to projects table
Run this once to update the database schema without losing data
"""

import sqlite3
import os

# Get database path
db_path = "./skillmap.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Migrating database: {db_path}")

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if columns already exist
cursor.execute("PRAGMA table_info(projects)")
columns = [row[1] for row in cursor.fetchall()]

# Add new columns if they don't exist
new_columns = [
    ("original_docx", "BLOB"),
    ("resume_json", "JSON"),
    ("doc_metadata", "JSON"),
    ("original_filename", "VARCHAR(255)")
]

for col_name, col_type in new_columns:
    if col_name not in columns:
        try:
            cursor.execute(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}")
            print(f"✓ Added column: {col_name} ({col_type})")
        except sqlite3.OperationalError as e:
            print(f"✗ Failed to add column {col_name}: {e}")
    else:
        print(f"- Column {col_name} already exists")

# Commit changes
conn.commit()
conn.close()

print("\nMigration completed successfully!")
print("You can now restart the backend server.")
