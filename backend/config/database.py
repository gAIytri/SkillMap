from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .settings import settings

# Create database engine with conditional pooling
# SQLite doesn't support connection pooling, PostgreSQL does
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}  # Required for SQLite with FastAPI
    )
else:
    # PostgreSQL/MySQL configuration with connection pooling
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,      # Test connections before using
        pool_size=10,             # Number of persistent connections
        max_overflow=20           # Additional connections if pool exhausted
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
