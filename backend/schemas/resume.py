from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ResumeUpload(BaseModel):
    """Schema for resume upload metadata"""
    original_filename: str


class ResumeResponse(BaseModel):
    """Schema for resume response"""
    id: int
    user_id: int
    original_filename: str
    latex_content: Optional[str] = None  # Deprecated, nullable
    doc_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ResumeUpdate(BaseModel):
    """Schema for updating resume"""
    latex_content: str
    doc_metadata: Optional[Dict[str, Any]] = None


class ResumeSave(BaseModel):
    """Schema for saving base resume"""
    latex_content: str
    doc_metadata: Dict[str, Any]
    original_filename: str


class ResumeConvertResponse(BaseModel):
    """Schema for DOCX to LaTeX conversion response"""
    latex_content: str
    metadata: Dict[str, Any]
    preview_available: bool = True


class ResumeTailorRequest(BaseModel):
    """Schema for tailoring resume request"""
    job_description: str = Field(..., min_length=10, description="Job description to tailor resume against")
