from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, LargeBinary, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from config.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_name = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=True)
    base_resume_id = Column(Integer, ForeignKey("base_resumes.id"), nullable=True)

    # Core fields for DOCX + JSON workflow
    original_docx = Column(LargeBinary, nullable=False)  # Store DOCX bytes
    resume_json = Column(JSON, nullable=False)  # Store extracted/tailored JSON
    doc_metadata = Column(JSON, nullable=True)  # Metadata
    original_filename = Column(String(255), nullable=False)  # Filename

    # Job description tracking
    last_tailoring_jd = Column(Text, nullable=True)  # Last successful JD used for tailoring

    # Cover letter and email fields
    cover_letter_text = Column(Text, nullable=True)  # Generated cover letter
    email_body_text = Column(Text, nullable=True)  # Generated recruiter email
    cover_letter_generated_at = Column(DateTime(timezone=True), nullable=True)  # When cover letter was generated
    email_generated_at = Column(DateTime(timezone=True), nullable=True)  # When email was generated

    # History tracking for resume tailoring (OLD SYSTEM - kept for migration)
    tailoring_history = Column(JSON, nullable=True)  # Array of previous versions with timestamps

    # NEW VERSION SYSTEM - Permanent version storage
    version_history = Column(JSON, nullable=True)  # {section_name: {"0": data, "1": data, ...}}
    current_versions = Column(JSON, nullable=True)  # {section_name: version_number}

    # Message history for chat-style interface (stores all JD/edit messages)
    message_history = Column(JSON, nullable=True)  # Array of {timestamp, text, type: 'job_description' | 'edit'}

    # PDF Caching (for performance optimization)
    cached_pdf = Column(LargeBinary, nullable=True)  # Cached PDF bytes
    cached_pdf_hash = Column(String(64), nullable=True, index=True)  # SHA256 hash of resume_json
    cached_pdf_generated_at = Column(DateTime(timezone=True), nullable=True)  # When PDF was cached

    # PDF Generation Status (for non-blocking UI)
    pdf_generating = Column(Boolean, default=False, nullable=False)  # Is PDF currently being generated
    pdf_generation_progress = Column(String(100), nullable=True)  # Progress message
    pdf_generation_started_at = Column(DateTime(timezone=True), nullable=True)  # When generation started

    # Legacy fields (keep for backward compatibility, but make nullable)
    tailored_latex_content = Column(Text, nullable=True)  # Deprecated
    pdf_url = Column(Text, nullable=True)  # Deprecated

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="projects")
    base_resume = relationship("BaseResume", back_populates="projects")

    def __repr__(self):
        return f"<Project(id={self.id}, name={self.project_name}, user_id={self.user_id})>"
