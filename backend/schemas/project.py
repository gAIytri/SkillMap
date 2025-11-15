from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class ProjectCreate(BaseModel):
    """Schema for creating a project"""
    project_name: str = Field(..., min_length=1, max_length=255)
    job_description: Optional[str] = None


class ProjectResponse(BaseModel):
    """Schema for project response"""
    id: int
    user_id: int
    project_name: str
    job_description: Optional[str] = None
    base_resume_id: Optional[int] = None

    # New fields for DOCX + JSON workflow
    resume_json: Optional[Dict[str, Any]] = None
    doc_metadata: Optional[Dict[str, Any]] = None
    original_filename: Optional[str] = None

    # History tracking
    tailoring_history: Optional[List[Dict[str, Any]]] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    project_name: Optional[str] = Field(None, min_length=1, max_length=255)
    job_description: Optional[str] = None


class ProjectList(BaseModel):
    """Schema for project list item"""
    id: int
    project_name: str
    job_description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True
