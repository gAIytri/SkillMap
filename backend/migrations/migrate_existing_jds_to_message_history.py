"""
Migration: Copy existing job descriptions from tailoring_history to message_history
Date: 2025-01-24
"""

from config.database import SessionLocal
from models.project import Project
from sqlalchemy.orm.attributes import flag_modified

def migrate_existing_data():
    """Migrate existing JDs from tailoring_history to message_history"""
    db = SessionLocal()

    try:
        projects = db.query(Project).all()
        migrated_count = 0

        for project in projects:
            # Skip if no tailoring history
            if not project.tailoring_history:
                continue

            # Initialize message_history if needed
            if project.message_history is None:
                project.message_history = []

            # Extract unique job descriptions from tailoring_history
            existing_messages = {msg['text'] for msg in project.message_history if msg.get('text')}

            for history_entry in project.tailoring_history:
                jd = history_entry.get('job_description', '') or history_entry.get('edit_instructions', '')

                if jd and jd not in existing_messages:
                    # Add to message_history
                    message_entry = {
                        'timestamp': history_entry.get('timestamp'),
                        'text': jd,
                        'type': 'job_description' if len(jd) > 200 else 'edit'
                    }
                    project.message_history.append(message_entry)
                    existing_messages.add(jd)

            if len(project.message_history) > 0:
                # Sort by timestamp (newest first)
                project.message_history.sort(key=lambda x: x['timestamp'], reverse=True)

                # Keep last 50 messages
                if len(project.message_history) > 50:
                    project.message_history = project.message_history[:50]

                # Mark as modified for SQLAlchemy
                flag_modified(project, 'message_history')
                migrated_count += 1

        db.commit()
        print(f"✓ Successfully migrated message history for {migrated_count} projects")

    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Running migration: migrate_existing_jds_to_message_history")
    migrate_existing_data()
    print("Migration completed successfully!")
