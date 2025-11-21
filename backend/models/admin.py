from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from config.database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_super_admin = Column(Boolean, nullable=False, default=False)  # Super admin has full permissions
    is_active = Column(Boolean, nullable=False, default=True)  # Can be disabled without deleting

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<Admin(id={self.id}, email={self.email}, name={self.full_name})>"
