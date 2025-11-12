from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectList
from middleware.auth_middleware import get_current_user
from models.user import User
from models.project import Project
from models.base_resume import BaseResume
from services.docx_recreation_service import recreate_docx_from_json
from services.resume_tailoring_service import tailor_resume
from services.docx_to_pdf_service import convert_docx_to_pdf
from schemas.resume import ResumeTailorRequest
from fastapi.responses import Response
import tempfile
import os
from fastapi import BackgroundTasks
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectList])
async def get_all_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects for current user"""
    projects = db.query(Project).filter(
        Project.user_id == current_user.id
    ).order_by(Project.updated_at.desc()).all()

    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    # Get user's base resume
    base_resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not base_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found. Please upload a base resume first."
        )

    # Create new project - Copy base_resume content
    new_project = Project(
        user_id=current_user.id,
        project_name=project_data.project_name,
        job_description=project_data.job_description,
        base_resume_id=base_resume.id,
        # Copy DOCX + JSON data from base_resume
        original_docx=base_resume.original_docx,
        resume_json=base_resume.resume_json,
        doc_metadata=base_resume.doc_metadata,
        original_filename=base_resume.original_filename
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Update fields
    if project_update.project_name is not None:
        project.project_name = project_update.project_name

    if project_update.job_description is not None:
        project.job_description = project_update.job_description

    if project_update.tailored_latex_content is not None:
        project.tailored_latex_content = project_update.tailored_latex_content

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/pdf")
async def download_project_pdf(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate PDF preview for a project (from DOCX)"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.original_docx or not project.resume_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume data not found for this project"
        )

    try:
        # Step 1: Recreate DOCX from original + JSON
        logger.info(f"Recreating DOCX for project {project_id} PDF preview...")
        recreated_docx_bytes = recreate_docx_from_json(
            project.original_docx,
            project.resume_json
        )

        # Step 2: Convert DOCX to PDF (or return DOCX if conversion fails)
        logger.info(f"Converting DOCX to PDF for project {project_id}...")
        file_bytes, media_type = convert_docx_to_pdf(recreated_docx_bytes)

        # Determine file extension based on media type
        is_pdf = media_type == "application/pdf"
        file_ext = "pdf" if is_pdf else "docx"

        # Return file with inline disposition for browser preview
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{project.project_name.replace(" ", "_")}_preview.{file_ext}"'
            }
        )

    except Exception as e:
        logger.error(f"Failed to generate PDF for project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )


@router.get("/{project_id}/docx")
async def download_project_docx(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download DOCX for a project (recreated from JSON)"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.original_docx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original DOCX not found for this project"
        )

    if not project.resume_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume JSON not found for this project"
        )

    try:
        # Recreate DOCX from original + JSON
        logger.info(f"Recreating DOCX for project {project_id}...")
        recreated_docx_bytes = recreate_docx_from_json(
            project.original_docx,
            project.resume_json
        )

        # Save to temporary file for download
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            tmp.write(recreated_docx_bytes)
            tmp_path = tmp.name

        # Schedule cleanup of temp file after response is sent
        background_tasks.add_task(os.unlink, tmp_path)

        # Return file
        filename = f"{project.project_name.replace(' ', '_')}.docx"
        return FileResponse(
            tmp_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=filename
        )

    except Exception as e:
        logger.error(f"Failed to recreate DOCX for project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate DOCX: {str(e)}"
        )


@router.post("/{project_id}/tailor")
async def tailor_project_resume(
    project_id: int,
    request: ResumeTailorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tailor project resume for a specific job description

    Process:
    1. Fetch project resume JSON
    2. Send to OpenAI with job description for tailoring
    3. Update project's resume_json (NOT base_resume)
    4. Return tailored JSON
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.resume_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume JSON not found for this project"
        )

    try:
        logger.info(f"Tailoring resume for project {project_id}...")

        # Tailor resume using OpenAI
        tailored_json = tailor_resume(project.resume_json, request.job_description)

        # Update PROJECT's resume_json (not base_resume)
        project.resume_json = tailored_json
        db.commit()
        db.refresh(project)

        logger.info(f"Project {project_id} resume tailored successfully")

        return {
            "success": True,
            "tailored_json": tailored_json,
            "message": "Resume tailored successfully"
        }

    except Exception as e:
        logger.error(f"Failed to tailor project {project_id} resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to tailor resume: {str(e)}"
        )
