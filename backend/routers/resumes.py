from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from pathlib import Path
import asyncio
import json
import logging
import tempfile
import os

from config.database import get_db
from config.settings import settings
from schemas.resume import ResumeResponse, ResumeUpdate, ResumeConvertResponse, ResumeSave, ResumeTailorRequest
from middleware.auth_middleware import get_current_user
from models.user import User
from models.base_resume import BaseResume
from services.resume_extractor import extract_resume
from services.docx_generation_service import generate_resume_from_json, get_default_section_order

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload")
async def upload_and_convert_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload resume (DOCX, PDF, or Image) and extract data with streaming status updates

    Supported formats:
    - DOCX (.docx, .doc)
    - PDF (.pdf)
    - Images (.jpg, .jpeg, .png, .bmp, .tiff)

    Process:
    1. Validate file format
    2. Try fast text extraction
    3. Fallback to OCR if needed (with status update)
    4. Parse with AI
    5. Save to database
    6. Return structured JSON

    Returns:
        Server-Sent Events stream with status updates and final result
    """

    # Read file content BEFORE creating generator (important!)
    file_content = await file.read()
    filename = file.filename

    async def event_generator():
        """Generate Server-Sent Events for status updates"""
        try:
            status_messages = []

            def status_callback(message: str):
                """Collect status messages"""
                status_messages.append(message)

            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Uploading resume...'})}\n\n"
            await asyncio.sleep(0)  # Force flush

            try:
                # Extract structured JSON using hybrid approach
                logger.info(f"Processing file: {filename}")

                # Use the hybrid extractor with status callbacks
                resume_json = extract_resume(
                    file_content,
                    filename=filename,
                    status_callback=status_callback
                )

                # Send each status message to frontend
                for msg in status_messages:
                    yield f"data: {json.dumps({'type': 'status', 'message': msg})}\n\n"
                    await asyncio.sleep(0)

                logger.info("Resume extracted successfully")

                # Generate DOCX from extracted JSON (regardless of input format)
                # This ensures we always have a valid DOCX for templating
                yield f"data: {json.dumps({'type': 'status', 'message': 'Generating DOCX template...'})}\n\n"
                await asyncio.sleep(0)

                try:
                    from services.docx_generation_service import generate_resume_from_json

                    # If original file is DOCX, use it as base; otherwise create from scratch
                    base_docx = file_content if filename.lower().endswith(('.docx', '.doc')) else None

                    generated_docx = generate_resume_from_json(
                        resume_json=resume_json,
                        base_resume_docx=base_docx,
                        section_order=None  # Use default order
                    )
                    logger.info("DOCX template generated successfully")
                except Exception as e:
                    logger.error(f"Failed to generate DOCX template: {e}")
                    # Fallback: use original if DOCX, otherwise None
                    generated_docx = file_content if filename.lower().endswith(('.docx', '.doc')) else None

                # Save original file and JSON to database
                yield f"data: {json.dumps({'type': 'status', 'message': 'Saving to database...'})}\n\n"
                await asyncio.sleep(0)

                existing_resume = db.query(BaseResume).filter(
                    BaseResume.user_id == current_user.id
                ).first()

                if existing_resume:
                    # Update existing resume
                    existing_resume.original_filename = filename
                    existing_resume.original_docx = generated_docx  # Store generated DOCX
                    existing_resume.resume_json = resume_json
                    existing_resume.doc_metadata = {"original_filename": filename}
                    existing_resume.latex_content = None
                    db.commit()
                    db.refresh(existing_resume)
                else:
                    # Create new resume
                    new_resume = BaseResume(
                        user_id=current_user.id,
                        original_filename=filename,
                        original_docx=generated_docx,  # Store generated DOCX
                        resume_json=resume_json,
                        doc_metadata={"original_filename": filename},
                        latex_content=None
                    )
                    db.add(new_resume)
                    db.commit()
                    db.refresh(new_resume)

                logger.info("Saved to database successfully")

                # Send final success message
                final_response = {
                    "type": "final",
                    "success": True,
                    "metadata": {
                        "resume_json": resume_json,
                        "original_filename": filename
                    },
                    "preview_available": True
                }

                yield f"data: {json.dumps(final_response)}\n\n"

            except ValueError as e:
                # File format error
                error_msg = str(e)
                logger.error(f"File format error: {error_msg}")

                error_response = {
                    "type": "error",
                    "message": error_msg,
                    "details": "Please upload a supported file format: DOCX, PDF, or image (JPG, PNG)"
                }
                yield f"data: {json.dumps(error_response)}\n\n"

            except Exception as e:
                # General extraction error
                error_msg = str(e)
                logger.error(f"Resume extraction failed: {error_msg}")
                import traceback
                traceback.print_exc()

                error_response = {
                    "type": "error",
                    "message": f"Failed to extract resume: {error_msg}",
                    "details": "Please ensure the file contains readable text and try again."
                }
                yield f"data: {json.dumps(error_response)}\n\n"

        except Exception as e:
            logger.error(f"Upload failed: {e}")
            import traceback
            traceback.print_exc()

            error_response = {
                "type": "error",
                "message": f"Upload failed: {str(e)}"
            }
            yield f"data: {json.dumps(error_response)}\n\n"

    # Return streaming response
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable buffering for nginx
        }
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
        # Generate DOCX programmatically with user's section order
        logger.info("Generating DOCX for base resume...")

        # Get user's section order (or use default)
        section_order = current_user.section_order if current_user.section_order else get_default_section_order()

        # Generate resume from JSON using original DOCX as style reference
        recreated_docx_bytes = generate_resume_from_json(
            resume_json=resume.resume_json,
            base_resume_docx=resume.original_docx,
            section_order=section_order
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


