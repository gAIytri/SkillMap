"""
Migration: Add project_name field to credit_transactions table
This denormalizes project name for faster transaction display without joins.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine, SessionLocal
from models.credit_transaction import CreditTransaction
from models.project import Project

def migrate():
    """Add project_name column and populate with existing project names"""

    print("🔄 Starting migration: Add project_name to credit_transactions table...")

    with engine.connect() as conn:
        # Check if column already exists (PostgreSQL syntax)
        result = conn.execute(text("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name='credit_transactions' AND column_name='project_name'
        """))

        if result.scalar() > 0:
            print("✓ Column 'project_name' already exists. Skipping migration.")
            return

        # Add the column
        print("Adding 'project_name' column to credit_transactions table...")
        conn.execute(text("""
            ALTER TABLE credit_transactions
            ADD COLUMN project_name VARCHAR(255)
        """))
        conn.commit()
        print("✓ Column added successfully")

    # Populate project_name for existing transactions
    print("Populating project_name for existing transactions...")

    db = SessionLocal()
    try:
        # Get all transactions with project_id
        transactions = db.query(CreditTransaction).filter(
            CreditTransaction.project_id.isnot(None)
        ).all()

        updated_count = 0
        for transaction in transactions:
            # Get project name
            project = db.query(Project).filter(Project.id == transaction.project_id).first()
            if project:
                transaction.project_name = project.project_name
                updated_count += 1

        db.commit()
        print(f"✓ Populated project_name for {updated_count} transactions")

    except Exception as e:
        db.rollback()
        print(f"❌ Error populating project_name: {e}")
        raise
    finally:
        db.close()

    print("✅ Migration completed successfully!")

def rollback():
    """Remove project_name column"""
    print("🔄 Rolling back migration: Remove project_name from credit_transactions table...")

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE credit_transactions DROP COLUMN project_name"))
            conn.commit()
            print("✓ Column 'project_name' removed successfully")
        except Exception as e:
            print(f"❌ Error rolling back: {e}")
            raise

    print("✅ Rollback completed!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
