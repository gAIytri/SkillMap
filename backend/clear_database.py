"""
Clear database script - Removes all data from tables
Run this to start fresh
"""

import sqlite3
import os

db_path = "./skillmap.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

print(f"Clearing database: {db_path}")
print("\nWARNING: This will delete ALL data from the database!")
response = input("Are you sure you want to continue? (yes/no): ")

if response.lower() != 'yes':
    print("Aborted.")
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear all tables
tables = ['projects', 'base_resumes', 'users']

for table in tables:
    try:
        cursor.execute(f"DELETE FROM {table}")
        count = cursor.rowcount
        print(f"✓ Cleared {count} records from {table}")
    except sqlite3.OperationalError as e:
        print(f"✗ Failed to clear {table}: {e}")

# Commit changes
conn.commit()
conn.close()

print("\n✓ Database cleared successfully!")
print("You can now register a new account and upload your resume.")
