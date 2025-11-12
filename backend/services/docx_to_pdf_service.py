"""
DOCX to PDF Conversion Service
Converts DOCX bytes to PDF for preview/download
"""

import subprocess
import tempfile
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def convert_docx_to_pdf(docx_bytes: bytes) -> tuple[bytes, str]:
    """
    Convert DOCX bytes to PDF bytes

    Uses LibreOffice in headless mode for conversion
    Falls back to returning DOCX if LibreOffice is not available

    Args:
        docx_bytes: DOCX file content as bytes

    Returns:
        tuple: (file_bytes, media_type) - Either PDF or DOCX
    """
    # Create temporary directory for conversion
    with tempfile.TemporaryDirectory() as temp_dir:
        # Save DOCX to temp file
        docx_path = os.path.join(temp_dir, "input.docx")
        with open(docx_path, "wb") as f:
            f.write(docx_bytes)

        # Try to convert using LibreOffice
        try:
            logger.info("Converting DOCX to PDF using LibreOffice...")

            # Try different LibreOffice commands (varies by OS)
            libreoffice_commands = [
                "soffice",  # Linux/Windows
                "libreoffice",  # Linux
                "/Applications/LibreOffice.app/Contents/MacOS/soffice",  # macOS
            ]

            conversion_success = False
            for cmd in libreoffice_commands:
                try:
                    # Run LibreOffice conversion
                    subprocess.run(
                        [
                            cmd,
                            "--headless",
                            "--convert-to",
                            "pdf",
                            "--outdir",
                            temp_dir,
                            docx_path
                        ],
                        check=True,
                        capture_output=True,
                        timeout=30
                    )
                    conversion_success = True
                    logger.info(f"Conversion successful using {cmd}")
                    break
                except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                    continue

            if not conversion_success:
                logger.warning("LibreOffice not found or conversion failed, returning DOCX")
                # Return original DOCX as fallback
                return (docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

            # Read generated PDF
            pdf_path = os.path.join(temp_dir, "input.pdf")
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    pdf_bytes = f.read()
                logger.info("PDF generated successfully")
                return (pdf_bytes, "application/pdf")
            else:
                logger.warning("PDF file not generated, returning DOCX")
                return (docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

        except Exception as e:
            logger.error(f"DOCX to PDF conversion failed: {e}")
            # Return original DOCX as fallback
            return (docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")


def is_libreoffice_available() -> bool:
    """Check if LibreOffice is available for conversion"""
    libreoffice_commands = [
        "soffice",
        "libreoffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ]

    for cmd in libreoffice_commands:
        try:
            subprocess.run(
                [cmd, "--version"],
                check=True,
                capture_output=True,
                timeout=5
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            continue

    return False
