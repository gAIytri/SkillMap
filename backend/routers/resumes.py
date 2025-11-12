from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from config.database import get_db
from config.settings import settings
from schemas.resume import ResumeResponse, ResumeUpdate, ResumeConvertResponse, ResumeSave, ResumeTailorRequest
from middleware.auth_middleware import get_current_user
from models.user import User
from models.base_resume import BaseResume
from services.resume_extractor import extract_resume  # LLM extraction
from services.docx_recreation_service import recreate_docx_from_json  # DOCX recreation
from services.resume_tailoring_service import tailor_resume  # Resume tailoring
from utils.helpers import validate_file_extension, save_upload_file
import logging
import tempfile
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeConvertResponse)
async def upload_and_convert_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload DOCX and extract resume data

    Process:
    1. Validate file
    2. Extract structured JSON (LLM)
    3. Convert to LaTeX (for PDF)
    4. Return both formats
    """
    # Validate file extension
    if not validate_file_extension(file.filename, settings.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .docx files are allowed"
        )

    # Read file content
    content = await file.read()

    try:
        # Extract structured JSON using LLM
        logger.info("Extracting resume with LLM...")
        resume_json = extract_resume(content)
        logger.info("Resume extracted successfully")

        # Save original DOCX and JSON to database
        logger.info("Saving to database...")
        existing_resume = db.query(BaseResume).filter(
            BaseResume.user_id == current_user.id
        ).first()

        if existing_resume:
            # Update existing resume
            existing_resume.original_filename = file.filename
            existing_resume.original_docx = content
            existing_resume.resume_json = resume_json
            existing_resume.doc_metadata = {"original_filename": file.filename}
            existing_resume.latex_content = None  # No longer using LaTeX
            db.commit()
            db.refresh(existing_resume)
        else:
            # Create new resume
            new_resume = BaseResume(
                user_id=current_user.id,
                original_filename=file.filename,
                original_docx=content,
                resume_json=resume_json,
                doc_metadata={"original_filename": file.filename},
                latex_content=None  # No longer using LaTeX
            )
            db.add(new_resume)
            db.commit()
            db.refresh(new_resume)

        logger.info("Saved to database successfully")

        # Return response
        return ResumeConvertResponse(
            latex_content="",  # Not used anymore
            metadata={
                "resume_json": resume_json,
                "original_filename": file.filename
            },
            preview_available=True
        )

    except Exception as e:
        logger.error(f"Resume processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process resume: {str(e)}"
        )


@router.post("/base", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def save_base_resume(
    resume_data: ResumeSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save converted LaTeX as user's base resume"""
    # Check if user already has a base resume
    existing_resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if existing_resume:
        # Update existing base resume
        existing_resume.latex_content = resume_data.latex_content
        existing_resume.doc_metadata = resume_data.doc_metadata
        existing_resume.original_filename = resume_data.original_filename
        db.commit()
        db.refresh(existing_resume)
        return existing_resume
    else:
        # Create new base resume
        new_resume = BaseResume(
            user_id=current_user.id,
            original_filename=resume_data.original_filename,
            latex_content=resume_data.latex_content,
            doc_metadata=resume_data.doc_metadata
        )
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        return new_resume


@router.get("/base", response_model=ResumeResponse)
async def get_base_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's base resume"""
    resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found. Please upload a resume first."
        )

    return resume


@router.put("/base", response_model=ResumeResponse)
async def update_base_resume(
    resume_update: ResumeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's base resume"""
    resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found"
        )

    resume.latex_content = resume_update.latex_content
    if resume_update.doc_metadata:
        resume.doc_metadata = resume_update.doc_metadata

    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/base", status_code=status.HTTP_204_NO_CONTENT)
async def delete_base_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user's base resume"""
    resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found"
        )

    db.delete(resume)
    db.commit()
    return None


@router.get("/base/pdf")
async def get_base_resume_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate and download PDF of base resume"""
    resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found"
        )

    # Generate PDF
    pdf_path = generate_pdf(resume.latex_content, f"resume_{current_user.id}")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{resume.original_filename.replace('.docx', '')}.pdf"
    )


@router.get("/base/recreated-docx")
async def get_recreated_docx(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download recreated DOCX from JSON data

    This endpoint:
    1. Fetches original DOCX and extracted JSON from database
    2. Recreates DOCX with JSON modifications
    3. Returns DOCX file for download

    For testing: Returns original DOCX as-is to verify storage works
    Later: Will apply JSON modifications
    """
    resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found"
        )

    if not resume.original_docx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original DOCX not found. Please upload a resume again."
        )

    if not resume.resume_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume JSON not found. Please upload a resume again."
        )

    try:
        # Recreate DOCX from original + JSON
        logger.info("Recreating DOCX from stored data...")
        recreated_docx_bytes = recreate_docx_from_json(
            resume.original_docx,
            resume.resume_json
        )

        # Save to temporary file for download
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            tmp.write(recreated_docx_bytes)
            tmp_path = tmp.name

        # Schedule cleanup of temp file after response is sent
        background_tasks.add_task(os.unlink, tmp_path)

        # Return file
        filename = resume.original_filename.replace('.docx', '_recreated.docx')
        return FileResponse(
            tmp_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=filename
        )

    except Exception as e:
        logger.error(f"Failed to recreate DOCX: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recreate DOCX: {str(e)}"
        )


@router.post("/base/tailor")
async def tailor_base_resume(
    request: ResumeTailorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tailor base resume for a specific job description
    NOTE: This endpoint is deprecated. Use project-specific tailoring instead.

    Process:
    1. Fetch base resume JSON
    2. Send to OpenAI with job description for tailoring
    3. Update resume_json in database
    4. Return tailored JSON
    """
    resume = db.query(BaseResume).filter(
        BaseResume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Base resume not found"
        )

    if not resume.resume_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume JSON not found. Please upload a resume again."
        )

    try:
        logger.info("Tailoring resume for job description...")

        # Tailor resume using OpenAI
        tailored_json = tailor_resume(resume.resume_json, request.job_description)

        # Update database with tailored JSON
        resume.resume_json = tailored_json
        db.commit()
        db.refresh(resume)

        logger.info("Resume tailored successfully")

        return {
            "success": True,
            "tailored_json": tailored_json,
            "message": "Resume tailored successfully"
        }

    except Exception as e:
        logger.error(f"Failed to tailor resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to tailor resume: {str(e)}"
        )
