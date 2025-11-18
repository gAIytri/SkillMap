from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
import asyncio
import json

from config.database import get_db
from config.settings import settings
from schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectList, SectionOrderUpdate
from middleware.auth_middleware import get_current_user
from models.user import User
from models.project import Project
from models.base_resume import BaseResume
from services.docx_recreation_service import recreate_docx_from_json  # Legacy - keeping for backup
from services.docx_generation_service import generate_resume_from_json, get_default_section_order
from services.resume_tailoring_service import tailor_resume
from services.resume_agent_service import tailor_resume_with_agent
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
        # Step 1: Generate DOCX programmatically with custom section order
        logger.info(f"Generating DOCX for project {project_id} PDF preview...")

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

        # Step 2: Convert DOCX to PDF (or return DOCX if conversion fails)
        logger.info(f"Converting DOCX to PDF for project {project_id}...")
        file_bytes, media_type = convert_docx_to_pdf(recreated_docx_bytes)

        # Determine file extension based on media type
        is_pdf = media_type == "application/pdf"
        file_ext = "pdf" if is_pdf else "docx"

        # Return file with inline disposition for browser preview
        # IMPORTANT: No-cache headers to prevent stale PDF after tailoring
        return Response(
            content=file_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{project.project_name.replace(" ", "_")}_preview.{file_ext}"',
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
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


@router.post("/{project_id}/tailor")
async def tailor_project_resume(
    project_id: int,
    request: ResumeTailorRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Tailor project resume for a specific job description (Legacy - non-streaming)

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


@router.post("/{project_id}/tailor-with-agent")
async def tailor_project_resume_with_agent(
    project_id: int,
    request: ResumeTailorRequest,
    current_user: User = Depends(get_current_user),
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
            async for update in tailor_resume_with_agent(
                resume_json=project.resume_json,
                job_description=request.job_description,
                project_id=project_id
            ):
                # Send update as SSE
                event_data = json.dumps(update)
                yield f"data: {event_data}\n\n"

                # Store final result
                if update.get("type") == "final":
                    final_result = update

            # Update database if tailoring succeeded
            if final_result and final_result.get("success") and final_result.get("tailored_json"):
                logger.info(f"Saving tailored resume to database for project {project_id}")

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
                        # Save current version to history before updating
                        from datetime import datetime

                        history_entry = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "resume_json": project_to_update.resume_json,
                            "job_description": request.job_description,
                            "changes_made": final_result.get("changes_made", [])
                        }

                        # Initialize history if it doesn't exist
                        if project_to_update.tailoring_history is None:
                            project_to_update.tailoring_history = []

                        # Add to history (keep last 10 versions)
                        project_to_update.tailoring_history.insert(0, history_entry)
                        if len(project_to_update.tailoring_history) > 10:
                            project_to_update.tailoring_history = project_to_update.tailoring_history[:10]

                        # Update with new tailored resume
                        project_to_update.resume_json = final_result["tailored_json"]

                        # Save the job description that was used for this tailoring
                        project_to_update.last_tailoring_jd = request.job_description
                        logger.info(f"✓ Saved last tailoring JD for project {project_id}")

                        # Save cover letter if generated
                        if final_result.get("cover_letter_success"):
                            project_to_update.cover_letter_text = final_result.get("cover_letter", "")
                            project_to_update.cover_letter_generated_at = datetime.utcnow()
                            logger.info(f"✓ Cover letter saved for project {project_id}")

                        # Save email if generated
                        if final_result.get("email_success"):
                            project_to_update.email_body_text = final_result.get("email_body", "")
                            project_to_update.email_generated_at = datetime.utcnow()
                            logger.info(f"✓ Email saved for project {project_id}")

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


@router.put("/{project_id}/section-order", response_model=ProjectResponse)
async def update_section_order(
    project_id: int,
    order_update: SectionOrderUpdate,
    current_user: User = Depends(get_current_user),
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

    # Validate section order contains valid sections
    valid_sections = {'personal_info', 'professional_summary', 'experience', 'projects', 'education', 'skills', 'certifications'}
    provided_sections = set(order_update.section_order)

    if not provided_sections.issubset(valid_sections):
        invalid = provided_sections - valid_sections
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sections: {invalid}"
        )

    # Update section_order in resume_json
    project.resume_json['section_order'] = order_update.section_order

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


@router.get("/{project_id}/cover-letter")
async def get_cover_letter(
    project_id: int,
    current_user: User = Depends(get_current_user),
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


@router.get("/{project_id}/email")
async def get_email_body(
    project_id: int,
    current_user: User = Depends(get_current_user),
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
