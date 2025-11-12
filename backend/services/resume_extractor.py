"""
Resume Extraction Service - Production Ready
Extracts resume content using OpenAI Structured Outputs
Clean, simple, reliable.
"""

from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List, Optional
from docx import Document
from io import BytesIO
import logging
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMA DEFINITIONS (Pydantic Models)
# ============================================================================

class PersonalInfo(BaseModel):
    """Personal information"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None


class ExperienceEntry(BaseModel):
    """Work experience entry"""
    company: str
    title: str
    location: Optional[str] = None
    start_date: str
    end_date: str  # "Present" if current
    bullets: List[str]


class EducationEntry(BaseModel):
    """Education entry"""
    degree: str
    institution: str
    location: Optional[str] = None
    graduation_date: str
    gpa: Optional[str] = None


class SkillCategory(BaseModel):
    """Skills grouped by category"""
    category: str  # e.g., "Languages", "Frontend", "Tools"
    skills: List[str]


class ProjectEntry(BaseModel):
    """Project entry"""
    name: str
    description: str
    technologies: List[str] = []
    link: Optional[str] = None


class ResumeData(BaseModel):
    """Complete resume structure - OpenAI will fill this"""
    personal_info: PersonalInfo
    professional_summary: Optional[str] = None
    experience: List[ExperienceEntry] = []
    education: List[EducationEntry] = []
    skills: List[SkillCategory] = []
    projects: List[ProjectEntry] = []
    certifications: List[str] = []


# ============================================================================
# EXTRACTOR SERVICE
# ============================================================================

class ResumeExtractor:
    """
    Extract resume using OpenAI Structured Outputs

    Usage:
        extractor = ResumeExtractor(api_key)
        resume_json = extractor.extract(docx_bytes)
    """

    def __init__(self, api_key: str = None):
        """Initialize with OpenAI API key"""
        # Try: parameter > settings > raise error
        self.api_key = api_key or settings.OPENAI_API_KEY

        if not self.api_key:
            raise ValueError(
                "OpenAI API key required. Set OPENAI_API_KEY in .env file"
            )

        self.client = OpenAI(api_key=self.api_key)

    def extract_text_from_docx(self, docx_bytes: bytes) -> str:
        """Extract plain text from DOCX"""
        try:
            doc = Document(BytesIO(docx_bytes))

            # Extract all paragraphs preserving structure
            text_parts = []
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    # Add section markers for better parsing
                    if para.style.name in ['Title', 'Heading 1']:
                        text = f"\n\n=== {text} ===\n"
                    elif para.style.name in ['Heading 2', 'Heading 3']:
                        text = f"\n\n## {text} ##\n"

                    text_parts.append(text)

            return '\n'.join(text_parts)

        except Exception as e:
            logger.error(f"DOCX text extraction failed: {e}")
            raise

    def extract(self, docx_bytes: bytes) -> dict:
        """
        Main extraction method

        Args:
            docx_bytes: DOCX file as bytes

        Returns:
            dict: Structured resume data matching ResumeData schema

        Raises:
            Exception: If extraction fails
        """
        try:
            # Step 1: Extract text from DOCX
            logger.info("Extracting text from DOCX...")
            resume_text = self.extract_text_from_docx(docx_bytes)

            # Step 2: Send to OpenAI with structured output
            logger.info("Sending to OpenAI for parsing...")

            prompt = f"""
Extract all information from this resume into structured format.

INSTRUCTIONS:
- Identify sections by context (not just keywords)
- Extract ALL content exactly as written
- Maintain chronological order (newest first)
- For skills, group by logical categories
- Preserve dates exactly (e.g., "Sept 2025", "Present")

RESUME:
{resume_text}
"""

            completion = self.client.beta.chat.completions.parse(
                model="gpt-4o-2024-08-06",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert resume parser. Extract information accurately into structured JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format=ResumeData,
                temperature=0.1  # Low temperature for consistent extraction
            )

            # Step 3: Get structured output (guaranteed valid!)
            resume_data = completion.choices[0].message.parsed

            logger.info("Resume extracted successfully")

            # Convert to dict
            return resume_data.model_dump()

        except Exception as e:
            logger.error(f"Resume extraction failed: {e}")
            raise Exception(f"Failed to extract resume: {str(e)}")


# ============================================================================
# HELPER FUNCTION (Simple API)
# ============================================================================

def extract_resume(docx_bytes: bytes, api_key: str = None) -> dict:
    """
    Simple function to extract resume

    Usage:
        resume_json = extract_resume(docx_bytes)
    """
    extractor = ResumeExtractor(api_key)
    return extractor.extract(docx_bytes)
