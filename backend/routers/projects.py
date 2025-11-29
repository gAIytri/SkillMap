from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse, Response
from sqlalchemy.orm import Session
import asyncio
import json
import tempfile
import os
import logging
from datetime import datetime

from config.database import get_db
from config.settings import settings
from schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectList, SectionOrderUpdate
from middleware.auth_middleware import get_current_user, get_current_verified_user
from models.user import User
from models.project import Project
from models.base_resume import BaseResume
from services.docx_generation_service import generate_resume_from_json, get_default_section_order
from services.resume_agent_service import tailor_resume_with_agent, edit_resume_with_instructions
from services.docx_to_pdf_service import convert_docx_to_pdf
from services.pdf_cache_service import (
    calculate_resume_hash,
    is_cache_valid,
    generate_pdf_background,
    get_cached_pdf
)
from schemas.resume import ResumeTailorRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectList])
async def get_all_projects(
    current_user: User = Depends(get_current_verified_user),
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
    current_user: User = Depends(get_current_verified_user),
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

    # Check for duplicate project names (prevent accidental duplicate clicks)
    # Only check recent projects created in the last 5 seconds
    from datetime import datetime, timedelta, timezone
    five_seconds_ago = datetime.now(timezone.utc) - timedelta(seconds=5)

    recent_duplicate = db.query(Project).filter(
        Project.user_id == current_user.id,
        Project.project_name == project_data.project_name,
        Project.created_at >= five_seconds_ago
    ).first()

    if recent_duplicate:
        # Return the existing project instead of creating a duplicate
        return recent_duplicate

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
    current_user: User = Depends(get_current_verified_user),
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
    current_user: User = Depends(get_current_verified_user),
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

    if project_update.resume_json is not None:
        project.resume_json = project_update.resume_json
        # Mark JSON column as modified for SQLAlchemy to detect the change
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(project, 'resume_json')

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_verified_user),
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
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Download PDF preview for a project

    NOW WITH SMART CACHING:
    - Returns cached PDF if resume_json hasn't changed (instant!)
    - Generates new PDF if data changed or cache missing
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

    if not project.original_docx or not project.resume_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume data not found for this project"
        )

    try:
        # Try to serve from cache first
        cached_pdf = get_cached_pdf(project)

        if cached_pdf:
            # Cache hit! Return immediately (0.1s)
            logger.info(f"✓ Serving cached PDF for project {project_id}")
            return Response(
                content=cached_pdf,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{project.project_name.replace(" ", "_")}_preview.pdf"',
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                    "X-PDF-Cached": "true"  # Debug header
                }
            )

        # Cache miss - generate new PDF (5s)
        logger.info(f"Cache miss for project {project_id} - generating new PDF")

        # Get section order (priority: resume_json > user preference > default)
        section_order = None
        if project.resume_json and 'section_order' in project.resume_json:
            section_order = project.resume_json['section_order']
        elif current_user.section_order:
            section_order = current_user.section_order
        else:
            section_order = get_default_section_order()

        # Generate resume from JSON
        recreated_docx_bytes = generate_resume_from_json(
            resume_json=project.resume_json,
            base_resume_docx=project.original_docx,
            section_order=section_order
        )

        # Convert DOCX to PDF
        file_bytes, media_type = convert_docx_to_pdf(recreated_docx_bytes)

        # Determine file extension
        is_pdf = media_type == "application/pdf"
        file_ext = "pdf" if is_pdf else "docx"

        # Return with no-cache headers
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{project.project_name.replace(" ", "_")}_preview.{file_ext}"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "X-PDF-Cached": "false"  # Debug header
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
    current_user: User = Depends(get_current_verified_user),
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
        # Generate DOCX programmatically with section order priority
        logger.info(f"Generating DOCX for project {project_id}...")

        # Get section order (priority: resume_json > user preference > default)
        section_order = None
        if project.resume_json and 'section_order' in project.resume_json:
            section_order = project.resume_json['section_order']
            logger.info(f"Using project-specific section order: {section_order}")
        elif current_user.section_order:
            section_order = current_user.section_order
            logger.info(f"Using user preference section order")
        else:
            section_order = get_default_section_order()
            logger.info(f"Using default section order")

        # Generate resume from JSON using original DOCX as style reference
        recreated_docx_bytes = generate_resume_from_json(
            resume_json=project.resume_json,
            base_resume_docx=project.original_docx,
            section_order=section_order
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


@router.post("/{project_id}/tailor-with-agent")
async def tailor_project_resume_with_agent(
    project_id: int,
    request: ResumeTailorRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Tailor project resume using LangChain Agent with streaming updates

    This endpoint uses a ReAct agent with:
    1. Guardrail to validate intent (job description or resume modification)
    2. Job summarization tool to extract requirements
    3. Resume tailoring tool to apply changes
    4. Streaming responses after each tool execution

    Process Flow:
    - User clicks "Tailor Resume" with job description
    - Agent validates intent (guardrail)
    - If valid: Agent summarizes job → tailors resume
    - Updates sent after each step
    - Final tailored JSON returned and saved to database

    Returns:
        StreamingResponse with Server-Sent Events (SSE) format
        Each event contains JSON with status updates
    """
    # Check user has sufficient credits
    if current_user.credits < settings.MINIMUM_CREDITS_FOR_TAILOR:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. You have {current_user.credits} credits. Minimum {settings.MINIMUM_CREDITS_FOR_TAILOR} credits required to tailor resume."
        )

    # Validate project exists
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

    async def event_generator():
        """Generate Server-Sent Events for streaming"""
        try:
            # Stream from the agent
            final_result = None
            tailored_json_for_pdf = None  # Store tailored JSON for immediate PDF generation

            async for update in tailor_resume_with_agent(
                resume_json=project.resume_json,
                job_description=request.job_description,
                project_id=project_id
            ):
                # Send update as SSE
                event_data = json.dumps(update)
                yield f"data: {event_data}\n\n"

                # OPTIMIZATION: Generate PDF immediately when resume is ready
                if update.get("type") == "resume_complete" and update.get("tailored_json"):
                    tailored_json_for_pdf = update.get("tailored_json")

                    try:
                        logger.info(f"Generating PDF immediately from tailored JSON for project {project_id}")

                        # Step 1: Generate DOCX from tailored JSON
                        from services.docx_generation_service import generate_resume_from_json
                        docx_bytes = generate_resume_from_json(
                            resume_json=tailored_json_for_pdf,
                            base_resume_docx=project.original_docx,
                            section_order=tailored_json_for_pdf.get('section_order')
                        )

                        # Step 2: Convert DOCX to PDF
                        pdf_bytes, _ = convert_docx_to_pdf(docx_bytes)

                        # Step 3: Encode PDF as base64 for transmission
                        import base64
                        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

                        logger.info(f"✓ PDF generated successfully for project {project_id}")

                        # Send pdf_ready event with PDF data
                        pdf_ready_event = json.dumps({
                            "type": "pdf_ready",
                            "message": "PDF generated successfully!",
                            "pdf_data": pdf_base64
                        })
                        yield f"data: {pdf_ready_event}\n\n"

                    except Exception as pdf_error:
                        logger.error(f"PDF generation failed: {pdf_error}")
                        error_event = json.dumps({
                            "type": "pdf_error",
                            "message": f"PDF generation failed: {str(pdf_error)}"
                        })
                        yield f"data: {error_event}\n\n"

                # Store final result
                if update.get("type") == "final":
                    final_result = update

            # Update database if tailoring succeeded
            if final_result and final_result.get("success") and final_result.get("tailored_json"):
                logger.info(f"Saving tailored resume to database for project {project_id}")
                logger.info(f"Final result keys: {list(final_result.keys())}")
                logger.info(f"Has cover_letter: {bool(final_result.get('cover_letter'))}")
                logger.info(f"Has email_body: {bool(final_result.get('email_body'))}")

                # Create a new database session for saving
                # (The original session might be detached after streaming)
                from config.database import SessionLocal
                from models import CreditTransaction, TransactionType
                from math import ceil
                db_new = SessionLocal()
                try:
                    # Fetch the project fresh from the database
                    project_to_update = db_new.query(Project).filter(
                        Project.id == project_id,
                        Project.user_id == current_user.id
                    ).first()

                    if project_to_update:
                        # NEW VERSION SYSTEM: Save versions with permanent version numbers
                        from datetime import datetime
                        from sqlalchemy.orm.attributes import flag_modified

                        # Initialize version_history and current_versions if they don't exist
                        if project_to_update.version_history is None:
                            project_to_update.version_history = {
                                "professional_summary": {},
                                "experience": {},
                                "projects": {},
                                "skills": {}
                            }

                        if project_to_update.current_versions is None:
                            project_to_update.current_versions = {
                                "professional_summary": 0,
                                "experience": 0,
                                "projects": 0,
                                "skills": 0
                            }

                        # Get current resume data
                        current_resume_json = project_to_update.resume_json
                        new_resume_json = final_result["tailored_json"]

                        # For each section, save current version and create new version ONLY if section changed
                        sections_to_track = ["professional_summary", "experience", "projects", "skills"]

                        for section in sections_to_track:
                            if section in current_resume_json and section in new_resume_json:
                                # Check if section actually changed by comparing old and new data
                                section_changed = current_resume_json[section] != new_resume_json[section]

                                if section_changed:
                                    # Section changed - create new version
                                    logger.info(f"Section '{section}' changed - creating new version")

                                    # Get the current version number for this section
                                    current_version_num = project_to_update.current_versions.get(section, 0)

                                    # Only save if version doesn't already exist in history
                                    # (prevents overwriting during first tailoring after migration)
                                    if str(current_version_num) not in project_to_update.version_history[section]:
                                        project_to_update.version_history[section][str(current_version_num)] = current_resume_json[section]

                                    # Increment version number for new tailored data
                                    new_version_num = current_version_num + 1

                                    # Save the NEW tailored data to version_history
                                    project_to_update.version_history[section][str(new_version_num)] = new_resume_json[section]

                                    # Update current_versions to point to new version
                                    project_to_update.current_versions[section] = new_version_num
                                else:
                                    # Section unchanged - keep same version number, but ensure current data is in history
                                    logger.info(f"Section '{section}' unchanged - keeping version {project_to_update.current_versions.get(section, 0)}")

                                    current_version_num = project_to_update.current_versions.get(section, 0)

                                    # Ensure current version exists in history (for first-time or migration cases)
                                    if str(current_version_num) not in project_to_update.version_history[section]:
                                        project_to_update.version_history[section][str(current_version_num)] = current_resume_json[section]

                        # Mark as modified for SQLAlchemy
                        flag_modified(project_to_update, "version_history")
                        flag_modified(project_to_update, "current_versions")

                        # OLD SYSTEM: Also save to tailoring_history for backward compatibility
                        history_entry = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "resume_json": current_resume_json,
                            "job_description": request.job_description,
                            "changes_made": final_result.get("changes_made", [])
                        }

                        if project_to_update.tailoring_history is None:
                            project_to_update.tailoring_history = []

                        project_to_update.tailoring_history.insert(0, history_entry)
                        if len(project_to_update.tailoring_history) > 10:
                            project_to_update.tailoring_history = project_to_update.tailoring_history[:10]

                        flag_modified(project_to_update, "tailoring_history")

                        # Save to message_history for chat interface
                        message_entry = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "text": request.job_description,
                            "type": "job_description"  # Will be detected as job_description or edit by intent
                        }

                        # Initialize message_history if it doesn't exist
                        if project_to_update.message_history is None:
                            project_to_update.message_history = []

                        # Add to message_history (keep last 50 messages)
                        project_to_update.message_history.insert(0, message_entry)
                        if len(project_to_update.message_history) > 50:
                            project_to_update.message_history = project_to_update.message_history[:50]

                        # Mark message_history as modified for SQLAlchemy
                        from sqlalchemy.orm.attributes import flag_modified
                        flag_modified(project_to_update, "message_history")

                        # Update with new tailored resume
                        project_to_update.resume_json = final_result["tailored_json"]
                        flag_modified(project_to_update, "resume_json")

                        # Save the job description that was used for this tailoring
                        project_to_update.last_tailoring_jd = request.job_description
                        logger.info(f"✓ Saved last tailoring JD for project {project_id}")

                        # Save cover letter if generated
                        cover_letter_text = final_result.get("cover_letter", "")
                        if cover_letter_text:
                            project_to_update.cover_letter_text = cover_letter_text
                            project_to_update.cover_letter_generated_at = datetime.utcnow()
                            logger.info(f"✓ Cover letter saved for project {project_id} (length: {len(cover_letter_text)} chars)")
                        else:
                            logger.warning(f"⚠ Cover letter is empty for project {project_id}, not saving")

                        # Save email if generated
                        email_body_text = final_result.get("email_body", "")
                        if email_body_text:
                            project_to_update.email_body_text = email_body_text
                            project_to_update.email_generated_at = datetime.utcnow()
                            logger.info(f"✓ Email saved for project {project_id} (length: {len(email_body_text)} chars)")
                        else:
                            logger.warning(f"⚠ Email body is empty for project {project_id}, not saving")

                        # Deduct credits based on actual token usage
                        token_usage = final_result.get("token_usage", {})
                        total_tokens = token_usage.get("total_tokens", 0)
                        prompt_tokens = token_usage.get("prompt_tokens", 0)
                        completion_tokens = token_usage.get("completion_tokens", 0)

                        # Calculate credits based on token usage
                        raw_credits = total_tokens / settings.TOKENS_PER_CREDIT
                        credits_to_deduct = round(raw_credits / settings.CREDIT_ROUNDING) * settings.CREDIT_ROUNDING  # Round to nearest 0.5

                        logger.info(f"Tokens used: {total_tokens}, Credits to deduct: {credits_to_deduct}")

                        # Fetch user with row-level lock to prevent race conditions
                        # .with_for_update() ensures no other transaction can modify this row
                        # until we commit (prevents double-spending if two tailorings happen simultaneously)
                        user_to_update = db_new.query(User).filter(User.id == current_user.id).with_for_update().first()
                        balance_after = 0.0  # Default value

                        if not user_to_update:
                            logger.error(f"User {current_user.id} not found for credit deduction!")
                        else:
                            # Deduct credits (row is locked, safe from concurrent modifications)
                            user_to_update.credits -= credits_to_deduct
                            balance_after = user_to_update.credits

                            # Create credit transaction record
                            transaction = CreditTransaction(
                                user_id=current_user.id,
                                project_id=project_id,
                                amount=-credits_to_deduct,  # Negative for deduction
                                balance_after=balance_after,
                                transaction_type=TransactionType.TAILOR,
                                tokens_used=total_tokens,
                                prompt_tokens=prompt_tokens,
                                completion_tokens=completion_tokens,
                                description=f"Resume tailored for project {project_id}"
                            )
                            db_new.add(transaction)

                            logger.info(
                                f"✓ Credits deducted: {credits_to_deduct} (from {balance_after + credits_to_deduct} to {balance_after})"
                            )

                        db_new.commit()
                        if user_to_update:
                            db_new.refresh(user_to_update)
                        logger.info(f"✓ Successfully saved tailored resume, history, and credits for project {project_id}")

                        # Send database update confirmation with credit info
                        yield f"data: {json.dumps({'type': 'db_update', 'message': 'Resume saved to database with version history', 'credits_deducted': credits_to_deduct, 'credits_remaining': balance_after})}\n\n"
                except Exception as db_error:
                    logger.error(f"Database save failed: {db_error}")
                    db_new.rollback()
                finally:
                    db_new.close()

        except Exception as e:
            logger.error(f"Agent streaming failed for project {project_id}: {e}")
            error_event = json.dumps({
                "type": "error",
                "message": f"Streaming failed: {str(e)}"
            })
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.post("/{project_id}/edit-resume")
async def edit_project_resume(
    project_id: int,
    request: ResumeTailorRequest,  # Reusing same request schema
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Edit project resume based on user instructions (no cover letter/email generation)

    This endpoint is used when the user wants to make specific edits to their resume
    without generating cover letter or email. It's triggered when the intent validator
    identifies "resume_modification" intent.

    Process Flow:
    - User provides edit instructions (e.g., "Add Python to skills section")
    - Agent validates intent
    - If valid: Agent applies edits to specific resume sections
    - Returns edited JSON and saves to database
    - Skips cover letter and email generation

    Returns:
        StreamingResponse with Server-Sent Events (SSE) format
        Each event contains JSON with status updates
    """
    # Check user has sufficient credits (editing costs less than tailoring)
    if current_user.credits < settings.MINIMUM_CREDITS_FOR_TAILOR:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. You have {current_user.credits} credits. Minimum {settings.MINIMUM_CREDITS_FOR_TAILOR} credits required."
        )

    # Validate project exists
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

    async def event_generator():
        """Generate Server-Sent Events for streaming"""
        try:
            # Stream from the editing agent
            final_result = None
            async for update in edit_resume_with_instructions(
                resume_json=project.resume_json,
                edit_instructions=request.job_description,  # Reusing field name
                project_id=project_id
            ):
                # Send update as SSE
                event_data = json.dumps(update)
                yield f"data: {event_data}\n\n"

                # Store final result
                if update.get("type") == "final":
                    final_result = update

            # Update database if editing succeeded
            if final_result and final_result.get("success") and final_result.get("edited_json"):
                logger.info(f"Saving edited resume to database for project {project_id}")

                # Create a new database session for saving
                from config.database import SessionLocal
                from models import CreditTransaction, TransactionType
                db_new = SessionLocal()
                try:
                    # Fetch the project fresh from the database
                    project_to_update = db_new.query(Project).filter(
                        Project.id == project_id,
                        Project.user_id == current_user.id
                    ).first()

                    if project_to_update:
                        # NEW VERSION SYSTEM: Save versions with permanent version numbers (same as tailoring)
                        from datetime import datetime
                        from sqlalchemy.orm.attributes import flag_modified

                        # Initialize version_history and current_versions if they don't exist
                        if project_to_update.version_history is None:
                            project_to_update.version_history = {
                                "professional_summary": {},
                                "experience": {},
                                "projects": {},
                                "skills": {}
                            }

                        if project_to_update.current_versions is None:
                            project_to_update.current_versions = {
                                "professional_summary": 0,
                                "experience": 0,
                                "projects": 0,
                                "skills": 0
                            }

                        # Get current and new resume data
                        current_resume_json = project_to_update.resume_json
                        new_resume_json = final_result["edited_json"]

                        # For each section, save current version and create new version ONLY if section changed
                        sections_to_track = ["professional_summary", "experience", "projects", "skills"]

                        for section in sections_to_track:
                            if section in current_resume_json and section in new_resume_json:
                                # Check if section actually changed by comparing old and new data
                                section_changed = current_resume_json[section] != new_resume_json[section]

                                if section_changed:
                                    # Section changed - create new version
                                    logger.info(f"Section '{section}' changed during edit - creating new version")

                                    # Get the current version number for this section
                                    current_version_num = project_to_update.current_versions.get(section, 0)

                                    # Only save if version doesn't already exist in history
                                    if str(current_version_num) not in project_to_update.version_history[section]:
                                        project_to_update.version_history[section][str(current_version_num)] = current_resume_json[section]

                                    # Increment version number for new edited data
                                    new_version_num = current_version_num + 1

                                    # Save the NEW edited data to version_history
                                    project_to_update.version_history[section][str(new_version_num)] = new_resume_json[section]

                                    # Update current_versions to point to new version
                                    project_to_update.current_versions[section] = new_version_num
                                else:
                                    # Section unchanged - keep same version number
                                    logger.info(f"Section '{section}' unchanged during edit - keeping version {project_to_update.current_versions.get(section, 0)}")

                                    current_version_num = project_to_update.current_versions.get(section, 0)

                                    # Ensure current version exists in history
                                    if str(current_version_num) not in project_to_update.version_history[section]:
                                        project_to_update.version_history[section][str(current_version_num)] = current_resume_json[section]

                        # Mark as modified for SQLAlchemy
                        flag_modified(project_to_update, "version_history")
                        flag_modified(project_to_update, "current_versions")

                        # OLD SYSTEM: Also save to tailoring_history for backward compatibility
                        history_entry = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "resume_json": current_resume_json,
                            "edit_instructions": request.job_description,
                            "changes_made": final_result.get("sections_modified", []),
                            "changes_description": final_result.get("changes_description", "")
                        }

                        # Initialize history if it doesn't exist
                        if project_to_update.tailoring_history is None:
                            project_to_update.tailoring_history = []

                        # Add to history (keep last 10 versions)
                        project_to_update.tailoring_history.insert(0, history_entry)
                        if len(project_to_update.tailoring_history) > 10:
                            project_to_update.tailoring_history = project_to_update.tailoring_history[:10]

                        flag_modified(project_to_update, "tailoring_history")

                        # Update with edited resume
                        project_to_update.resume_json = new_resume_json

                        # Don't update cover letter or email (editing only)

                        # Deduct credits based on actual token usage
                        token_usage = final_result.get("token_usage", {})
                        total_tokens = token_usage.get("total_tokens", 0)
                        prompt_tokens = token_usage.get("prompt_tokens", 0)
                        completion_tokens = token_usage.get("completion_tokens", 0)

                        # Calculate credits based on token usage
                        raw_credits = total_tokens / settings.TOKENS_PER_CREDIT
                        credits_to_deduct = round(raw_credits / settings.CREDIT_ROUNDING) * settings.CREDIT_ROUNDING

                        logger.info(f"Tokens used: {total_tokens}, Credits to deduct: {credits_to_deduct}")

                        # Fetch user with row-level lock
                        user_to_update = db_new.query(User).filter(User.id == current_user.id).with_for_update().first()
                        balance_after = 0.0

                        if not user_to_update:
                            logger.error(f"User {current_user.id} not found for credit deduction!")
                        else:
                            # Deduct credits
                            user_to_update.credits -= credits_to_deduct
                            balance_after = user_to_update.credits

                            # Create credit transaction record
                            transaction = CreditTransaction(
                                user_id=current_user.id,
                                project_id=project_id,
                                amount=-credits_to_deduct,
                                balance_after=balance_after,
                                transaction_type=TransactionType.TAILOR,  # Using same type
                                tokens_used=total_tokens,
                                prompt_tokens=prompt_tokens,
                                completion_tokens=completion_tokens,
                                description=f"Resume edited for project {project_id}"
                            )
                            db_new.add(transaction)

                            logger.info(f"✓ Credits deducted: {credits_to_deduct}")

                        db_new.commit()
                        if user_to_update:
                            db_new.refresh(user_to_update)
                        logger.info(f"✓ Successfully saved edited resume for project {project_id}")

                        # Send database update confirmation
                        yield f"data: {json.dumps({'type': 'db_update', 'message': 'Resume saved to database', 'credits_deducted': credits_to_deduct, 'credits_remaining': balance_after})}\n\n"
                except Exception as db_error:
                    logger.error(f"Database save failed: {db_error}")
                    db_new.rollback()
                finally:
                    db_new.close()

        except Exception as e:
            logger.error(f"Editing streaming failed for project {project_id}: {e}")
            error_event = json.dumps({
                "type": "error",
                "message": f"Editing failed: {str(e)}"
            })
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@router.put("/{project_id}/section-order", response_model=ProjectResponse)
async def update_section_order(
    project_id: int,
    order_update: SectionOrderUpdate,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Update section order for a project

    The section order is stored inside resume_json and used when generating PDF/DOCX.
    When user reorders sections in the UI, call this endpoint to save the new order.
    """
    # Get project
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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no resume data"
        )

    # Validate section order contains valid sections (including custom sections)
    valid_sections = {'personal_info', 'professional_summary', 'experience', 'projects', 'education', 'skills', 'certifications'}
    provided_sections = set(order_update.section_order)

    # Check that all provided sections are either valid standard sections OR custom sections
    custom_sections = project.resume_json.get('custom_sections', [])
    custom_section_ids = {section['id'] for section in custom_sections}

    invalid = provided_sections - valid_sections - custom_section_ids
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sections: {invalid}"
        )

    # IMPORTANT: Ensure personal_info is always at the top
    # Remove personal_info from the provided order (if present) and prepend it
    section_order_without_personal = [s for s in order_update.section_order if s != 'personal_info']

    # If personal_info exists in resume data, ensure it's always first
    if 'personal_info' in project.resume_json and project.resume_json['personal_info']:
        final_section_order = ['personal_info'] + section_order_without_personal
    else:
        # If no personal_info, just use the provided order
        final_section_order = section_order_without_personal

    # Update section_order in resume_json
    project.resume_json['section_order'] = final_section_order

    # IMPORTANT: Mark JSON column as modified for SQLAlchemy to detect the change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(project, 'resume_json')

    # Mark as updated
    from sqlalchemy import func
    project.updated_at = func.now()

    db.commit()
    db.refresh(project)

    logger.info(f"Updated section order for project {project_id}: {order_update.section_order}")

    return project


@router.post("/{project_id}/restore-version", response_model=ProjectResponse)
async def restore_version(
    project_id: int,
    section_name: str,
    version_number: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Restore a previous version for a specific section

    This endpoint:
    1. Retrieves the specified version from version_history
    2. Updates resume_json with that version's data
    3. Updates current_versions to point to the restored version

    Args:
        project_id: The project ID
        section_name: The section to restore (professional_summary, experience, projects, skills)
        version_number: The version number to restore

    Returns:
        Updated project with restored version
    """
    # Validate section_name
    valid_sections = ["professional_summary", "experience", "projects", "skills"]
    if section_name not in valid_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid section name. Must be one of: {valid_sections}"
        )

    # Get project
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.version_history or not project.current_versions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project has no version history"
        )

    # Check if version exists
    if section_name not in project.version_history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No version history for section: {section_name}"
        )

    version_str = str(version_number)
    if version_str not in project.version_history[section_name]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_number} not found for section {section_name}"
        )

    # Get the version data
    version_data = project.version_history[section_name][version_str]

    # Update resume_json with the restored version
    if not project.resume_json:
        project.resume_json = {}

    project.resume_json[section_name] = version_data

    # Update current_versions to point to the restored version
    project.current_versions[section_name] = version_number

    # Mark as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(project, 'resume_json')
    flag_modified(project, 'current_versions')

    # Mark as updated
    from sqlalchemy import func
    project.updated_at = func.now()

    db.commit()
    db.refresh(project)

    logger.info(f"Restored version {version_number} for section {section_name} in project {project_id}")

    return project


@router.post("/{project_id}/clear-version-history", response_model=ProjectResponse)
async def clear_version_history(
    project_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Clear all version history for a project, resetting it to a fresh state.
    This is typically called before replacing the resume to avoid confusion.

    This endpoint:
    1. Clears version_history dict
    2. Resets current_versions to all 0s
    3. Clears tailoring_history
    4. Returns the updated project
    """
    # Get project
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Clear version history
    project.version_history = {}
    project.current_versions = {
        "professional_summary": 0,
        "experience": 0,
        "projects": 0,
        "skills": 0
    }

    # Clear tailoring history
    project.tailoring_history = []

    # Mark as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(project, 'version_history')
    flag_modified(project, 'current_versions')
    flag_modified(project, 'tailoring_history')

    # Mark as updated
    from sqlalchemy import func
    project.updated_at = func.now()

    db.commit()
    db.refresh(project)

    logger.info(f"Cleared version history for project {project_id}")

    return project


@router.get("/{project_id}/cover-letter")
async def get_cover_letter(
    project_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get cover letter text for a project

    Returns the generated cover letter if available, otherwise 404.
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

    if not project.cover_letter_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover letter not generated yet. Please tailor the resume first."
        )

    return {
        "success": True,
        "cover_letter": project.cover_letter_text,
        "generated_at": project.cover_letter_generated_at.isoformat() if project.cover_letter_generated_at else None
    }


@router.get("/{project_id}/cover-letter/docx")
async def download_cover_letter_docx(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Download cover letter as DOCX with proper formatting and hyperlinks"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.cover_letter_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover letter not generated yet. Please tailor the resume first."
        )

    try:
        from services.docx_generation_service import generate_cover_letter_docx

        # Generate DOCX with hyperlinks (pass resume_json for LinkedIn URL)
        docx_bytes = generate_cover_letter_docx(project.cover_letter_text, project.resume_json)

        # Save to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            tmp.write(docx_bytes)
            tmp_path = tmp.name

        # Schedule cleanup
        background_tasks.add_task(os.unlink, tmp_path)

        # Return file
        filename = f"{project.project_name.replace(' ', '_')}_cover_letter.docx"
        return FileResponse(
            tmp_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=filename
        )

    except Exception as e:
        logger.error(f"Failed to generate cover letter DOCX: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cover letter: {str(e)}"
        )


@router.get("/{project_id}/cover-letter/pdf")
async def download_cover_letter_pdf(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Download cover letter as PDF with proper formatting and hyperlinks"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    if not project.cover_letter_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover letter not generated yet. Please tailor the resume first."
        )

    try:
        from services.docx_generation_service import generate_cover_letter_docx
        from services.docx_to_pdf_service import convert_docx_to_pdf

        # Generate DOCX with hyperlinks first (pass resume_json for LinkedIn URL)
        docx_bytes = generate_cover_letter_docx(project.cover_letter_text, project.resume_json)

        # Convert to PDF (returns tuple: file_bytes, media_type)
        file_bytes, media_type = convert_docx_to_pdf(docx_bytes)

        # Determine file extension based on media type
        is_pdf = media_type == "application/pdf"
        file_ext = "pdf" if is_pdf else "docx"

        # Return the file directly
        filename = f"{project.project_name.replace(' ', '_')}_cover_letter.{file_ext}"
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            }
        )

    except Exception as e:
        logger.error(f"Failed to generate cover letter PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate cover letter PDF: {str(e)}"
        )


@router.get("/{project_id}/email")
async def get_email_body(
    project_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get recruiter email for a project

    Returns the generated email subject and body if available, otherwise 404.
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

    if not project.email_body_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not generated yet. Please tailor the resume first."
        )

    # Extract subject from email body (first line if it starts with "Subject:")
    email_body = project.email_body_text
    subject = "Application for Position"  # Default subject
    body = email_body

    # Try to extract subject if present
    if email_body and (email_body.startswith("Subject:") or "Subject:" in email_body[:100]):
        lines = email_body.split('\n', 1)
        if len(lines) == 2 and "Subject:" in lines[0]:
            subject = lines[0].replace("Subject:", "").strip()
            body = lines[1].strip()

    return {
        "success": True,
        "email_subject": subject,
        "email_body": body,
        "generated_at": project.email_generated_at.isoformat() if project.email_generated_at else None
    }


# ============================================================================
# PDF CACHING AND GENERATION ENDPOINTS
# ============================================================================

@router.post("/{project_id}/compile", status_code=status.HTTP_200_OK)
async def compile_resume(
    project_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Compile resume to PDF with smart caching and WebSocket progress updates

    - First compile: ~5 seconds (non-blocking, real-time progress via WebSocket)
    - Subsequent compiles with no changes: Instant (cache hit)
    - Compiles after edits: ~2-5 seconds (non-blocking)

    WebSocket sends real-time updates:
    - "Building DOCX..."
    - "Converting to PDF..."
    - "Finalizing..."
    - "Complete"
    """
    # Get project
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Calculate hash of current resume JSON
    current_hash = calculate_resume_hash(project.resume_json)

    # Check if cached PDF is still valid
    if is_cache_valid(project, current_hash):
        logger.info(f"✓ Cache hit for project {project_id} - serving cached PDF instantly")
        return {
            "message": "PDF compiled successfully (cached)",
            "status": "ready",
            "cached": True,
            "generated_at": project.cached_pdf_generated_at.isoformat() if project.cached_pdf_generated_at else None
        }

    # Cache miss - start background generation
    logger.info(f"Cache miss for project {project_id} - starting background generation")

    # Mark as generating
    project.pdf_generating = True
    project.pdf_generation_progress = "Starting..."
    project.pdf_generation_started_at = datetime.utcnow()
    db.commit()

    # Capture user_id before background task
    user_id = current_user.id

    # Start background task with WebSocket updates
    async def run_generation():
        from config.database import SessionLocal
        db_session = SessionLocal()
        try:
            await generate_pdf_background(project_id, user_id, db_session)
        finally:
            db_session.close()

    background_tasks.add_task(run_generation)

    return {
        "message": "PDF compilation started",
        "status": "generating",
        "cached": False,
        "progress": "Starting...",
        "started_at": project.pdf_generation_started_at.isoformat()
    }


@router.get("/{project_id}/pdf-status", status_code=status.HTTP_200_OK)
async def get_pdf_generation_status(
    project_id: int,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Check PDF generation status (for polling)

    Frontend polls this every 500ms during generation

    Returns:
        - status: "generating", "ready", or "not_started"
        - progress: Current progress message
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.pdf_generating:
        return {
            "status": "generating",
            "progress": project.pdf_generation_progress,
            "started_at": project.pdf_generation_started_at.isoformat() if project.pdf_generation_started_at else None
        }

    # Check if we have cached PDF
    if project.cached_pdf:
        return {
            "status": "ready",
            "generated_at": project.cached_pdf_generated_at.isoformat() if project.cached_pdf_generated_at else None
        }

    return {"status": "not_started"}


# ============================================================================
# WEBSOCKET ENDPOINT FOR REAL-TIME UPDATES
# ============================================================================
# NOTE: WebSocket endpoint moved to main.py due to routing conflicts
# See main.py @app.websocket("/api/projects/ws")
