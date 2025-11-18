from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, LargeBinary
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

    # History tracking for resume tailoring
    tailoring_history = Column(JSON, nullable=True)  # Array of previous versions with timestamps

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
