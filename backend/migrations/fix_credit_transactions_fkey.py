"""
Migration: Fix foreign key constraint on credit_transactions.project_id

Problem: Cannot delete projects that have credit transactions
Solution: Change ON DELETE RESTRICT to ON DELETE SET NULL

Run this migration:
    cd backend
    source venv/bin/activate
    python migrations/fix_credit_transactions_fkey.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import engine
from sqlalchemy import text

def upgrade():
    """
    Drop and recreate the foreign key constraint with ON DELETE SET NULL
    """
    with engine.connect() as conn:
        print("Starting migration: fix_credit_transactions_fkey")

        # Step 1: Drop the existing foreign key constraint
        print("1. Dropping existing foreign key constraint...")
        conn.execute(text("""
            ALTER TABLE credit_transactions
            DROP CONSTRAINT IF EXISTS credit_transactions_project_id_fkey;
        """))
        conn.commit()
        print("   ✓ Constraint dropped")

        # Step 2: Recreate the constraint with ON DELETE SET NULL
        print("2. Creating new foreign key constraint with ON DELETE SET NULL...")
        conn.execute(text("""
            ALTER TABLE credit_transactions
            ADD CONSTRAINT credit_transactions_project_id_fkey
            FOREIGN KEY (project_id)
            REFERENCES projects(id)
            ON DELETE SET NULL;
        """))
        conn.commit()
        print("   ✓ Constraint created")

        print("\n✅ Migration completed successfully!")
        print("   Projects can now be deleted safely.")
        print("   Credit transactions will have project_id set to NULL when project is deleted.\n")

def downgrade():
    """
    Revert to original constraint (ON DELETE RESTRICT)
    """
    with engine.connect() as conn:
        print("Reverting migration: fix_credit_transactions_fkey")

        # Drop the new constraint
        print("1. Dropping new foreign key constraint...")
        conn.execute(text("""
            ALTER TABLE credit_transactions
            DROP CONSTRAINT IF EXISTS credit_transactions_project_id_fkey;
        """))
        conn.commit()

        # Recreate with original behavior (RESTRICT)
        print("2. Creating original foreign key constraint...")
        conn.execute(text("""
            ALTER TABLE credit_transactions
            ADD CONSTRAINT credit_transactions_project_id_fkey
            FOREIGN KEY (project_id)
            REFERENCES projects(id);
        """))
        conn.commit()

        print("\n✅ Migration reverted successfully!\n")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Credit Transactions Foreign Key Migration")
    print("="*60 + "\n")

    try:
        upgrade()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("   Please check your database connection and try again.\n")
        raise
