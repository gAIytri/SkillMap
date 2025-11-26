"""
PDF Cache Service - Smart Caching and Background Generation

Handles:
- Hash-based cache validation
- Background PDF generation
- Progress tracking
- Cache invalidation
"""

import hashlib
import json
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from models.project import Project
from services.docx_generation_service import generate_resume_from_json
from services.docx_to_pdf_service import convert_docx_to_pdf

logger = logging.getLogger(__name__)


def calculate_resume_hash(resume_json: Dict[str, Any]) -> str:
    """
    Calculate SHA256 hash of resume JSON for cache validation

    Args:
        resume_json: Resume data dictionary

    Returns:
        str: 64-character hex hash
    """
    # Sort keys to ensure consistent hashing
    json_str = json.dumps(resume_json, sort_keys=True)
    return hashlib.sha256(json_str.encode()).hexdigest()


def is_cache_valid(project: Project, current_hash: str) -> bool:
    """
    Check if cached PDF is still valid

    Args:
        project: Project instance
        current_hash: Hash of current resume JSON

    Returns:
        bool: True if cache is valid
    """
    return (
        project.cached_pdf is not None and
        project.cached_pdf_hash == current_hash
    )


async def generate_pdf_background(project_id: int, user_id: int, db: Session):
    """
    Generate PDF in background with real-time WebSocket progress updates

    Args:
        project_id: Project ID
        user_id: User ID (for security and WebSocket routing)
        db: Database session
    """
    try:
        # Get project
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == user_id
        ).first()

        if not project:
            logger.error(f"Project {project_id} not found for user {user_id}")
            return

        logger.info(f"Starting PDF generation for project {project_id}")

        # Calculate hash
        current_hash = calculate_resume_hash(project.resume_json)

        # Check if already cached and valid
        if is_cache_valid(project, current_hash):
            logger.info(f"✓ Cache already valid for project {project_id}, skipping generation")
            project.pdf_generating = False
            project.pdf_generation_progress = "Complete (cached)"
            db.commit()
            return

        # Step 1: Generate DOCX
        progress_msg = "Building DOCX..."
        project.pdf_generation_progress = progress_msg
        db.commit()

        logger.info(f"Generating DOCX for project {project_id}")
        docx_bytes = generate_resume_from_json(
            resume_json=project.resume_json,
            base_resume_docx=project.original_docx,
            section_order=project.resume_json.get('section_order')
        )

        # Step 2: Convert to PDF
        progress_msg = "Converting to PDF..."
        project.pdf_generation_progress = progress_msg
        db.commit()

        logger.info(f"Converting to PDF for project {project_id}")
        pdf_bytes, media_type = convert_docx_to_pdf(docx_bytes)

        # Step 3: Cache result
        progress_msg = "Finalizing..."
        project.pdf_generation_progress = progress_msg
        db.commit()

        logger.info(f"Caching PDF for project {project_id}")
        project.cached_pdf = pdf_bytes
        project.cached_pdf_hash = current_hash
        project.cached_pdf_generated_at = datetime.utcnow()
        project.pdf_generating = False
        project.pdf_generation_progress = "Complete"
        db.commit()

        logger.info(f"✓ PDF generated and cached successfully for project {project_id}")

    except Exception as e:
        logger.error(f"❌ PDF generation failed for project {project_id}: {e}", exc_info=True)

        # Update error status
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.pdf_generating = False
                error_msg = f"Error: {str(e)[:80]}"
                project.pdf_generation_progress = error_msg
                db.commit()
        except Exception as cleanup_error:
            logger.error(f"Failed to update error status: {cleanup_error}")


def invalidate_cache(project: Project, db: Session):
    """
    Invalidate cached PDF when resume data changes

    Args:
        project: Project instance
        db: Database session
    """
    if project.cached_pdf:
        logger.info(f"Invalidating PDF cache for project {project.id}")
        project.cached_pdf = None
        project.cached_pdf_hash = None
        project.cached_pdf_generated_at = None
        db.commit()


def get_cached_pdf(project: Project) -> Optional[bytes]:
    """
    Get cached PDF if valid

    Args:
        project: Project instance

    Returns:
        bytes or None: Cached PDF bytes if valid
    """
    current_hash = calculate_resume_hash(project.resume_json)

    if is_cache_valid(project, current_hash):
        logger.info(f"✓ Serving cached PDF for project {project.id}")
        return project.cached_pdf

    logger.info(f"Cache invalid or missing for project {project.id}")
    return None
