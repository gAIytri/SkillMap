from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, LargeBinary
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from config.database import Base


class BaseResume(Base):
    __tablename__ = "base_resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Core fields for JSON workflow
    original_filename = Column(String(255), nullable=False)
    original_docx = Column(LargeBinary, nullable=False)  # Original DOCX file bytes
    resume_json = Column(JSON, nullable=False)  # Extracted structured JSON from LLM
    doc_metadata = Column(JSON, nullable=True)  # Store styling info, fonts, colors, etc.

    # Legacy field (keep for backward compatibility, but make nullable)
    latex_content = Column(Text, nullable=True)  # Deprecated - kept for backward compatibility

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="base_resume")
    projects = relationship("Project", back_populates="base_resume")

    def __repr__(self):
        return f"<BaseResume(id={self.id}, user_id={self.user_id}, filename={self.original_filename})>"
