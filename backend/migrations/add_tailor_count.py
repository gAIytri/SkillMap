"""
Migration: Add tailor_count field to users table
This field tracks the total number of resume tailorings per user for accurate stats.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from config.database import engine, SessionLocal
from models.user import User
from models.credit_transaction import CreditTransaction, TransactionType

def migrate():
    """Add tailor_count column and initialize with existing TAILOR transaction counts"""

    print("🔄 Starting migration: Add tailor_count to users table...")

    with engine.connect() as conn:
        # Check if column already exists (PostgreSQL syntax)
        result = conn.execute(text("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name='users' AND column_name='tailor_count'
        """))

        if result.scalar() > 0:
            print("✓ Column 'tailor_count' already exists. Skipping migration.")
            return

        # Add the column with default value 0
        print("Adding 'tailor_count' column to users table...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN tailor_count INTEGER NOT NULL DEFAULT 0
        """))
        conn.commit()
        print("✓ Column added successfully")

    # Initialize tailor_count for existing users based on their transaction history
    print("Initializing tailor_count for existing users...")

    db = SessionLocal()
    try:
        # Get all users
        users = db.query(User).all()

        for user in users:
            # Count TAILOR transactions for this user
            tailor_count = db.query(CreditTransaction).filter(
                CreditTransaction.user_id == user.id,
                CreditTransaction.transaction_type == TransactionType.TAILOR
            ).count()

            # Update user's tailor_count
            user.tailor_count = tailor_count
            print(f"  User {user.id} ({user.email}): {tailor_count} tailorings")

        db.commit()
        print(f"✓ Initialized tailor_count for {len(users)} users")

    except Exception as e:
        db.rollback()
        print(f"❌ Error initializing tailor_count: {e}")
        raise
    finally:
        db.close()

    print("✅ Migration completed successfully!")

def rollback():
    """Remove tailor_count column"""
    print("🔄 Rolling back migration: Remove tailor_count from users table...")

    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users DROP COLUMN tailor_count"))
            conn.commit()
            print("✓ Column 'tailor_count' removed successfully")
        except Exception as e:
            print(f"❌ Error rolling back: {e}")
            raise

    print("✅ Rollback completed!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
