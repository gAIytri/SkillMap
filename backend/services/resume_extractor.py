"""
Resume Extraction Service - Production Ready
Extracts resume content using OpenAI Structured Outputs
Clean, simple, reliable.
"""

from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from docx import Document
from io import BytesIO
import logging
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)


# ============================================================================
# SCHEMA DEFINITIONS (Pydantic Models)
# ============================================================================

class HeaderLink(BaseModel):
    """Generic header link - can be any type (LinkedIn, GitHub, etc.)"""
    text: str  # Display text (e.g., "LinkedIn", "Portfolio")
    url: Optional[str] = None  # Actual URL if available


class PersonalInfo(BaseModel):
    """Personal information"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    header_links: List[HeaderLink] = []  # Generic dynamic links


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

    def extract_hyperlinks_from_para(self, para) -> List[Dict[str, str]]:
        """Extract hyperlinks from a paragraph"""
        links = []
        try:
            # Check if paragraph has hyperlinks
            for run in para.runs:
                # Check if run is part of a hyperlink
                if run._element.tag.endswith('hyperlink'):
                    continue

            # Get all hyperlink relationships
            rels = para.part.rels
            for rel in rels.values():
                if "hyperlink" in rel.reltype:
                    # Found a hyperlink - extract text and URL
                    pass

            # Alternative: Parse hyperlinks from XML
            from docx.oxml import parse_xml
            for hyperlink in para._element.findall('.//w:hyperlink', namespaces={
                'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            }):
                # Get hyperlink text
                text = ''.join(node.text for node in hyperlink.iter() if node.text)

                # Get hyperlink URL (r:id attribute)
                r_id = hyperlink.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                url = None
                if r_id and para.part.rels.get(r_id):
                    url = para.part.rels[r_id].target_ref

                if text:
                    links.append({"text": text.strip(), "url": url})

        except Exception as e:
            logger.warning(f"Failed to extract hyperlinks: {e}")

        return links

    def extract_text_from_docx(self, docx_bytes: bytes) -> str:
        """Extract plain text from DOCX including text boxes and shapes"""
        try:
            doc = Document(BytesIO(docx_bytes))

            text_parts = []

            # 1. Extract text from shapes and text boxes first (often contains header)
            from docx.text.paragraph import Paragraph

            # Search for text boxes in the document
            for element in doc.element.body:
                # Check if element contains text box content (txbxContent)
                for shape in element.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}txbxContent'):
                    # Extract paragraphs from text box
                    for p_elem in shape.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                        para = Paragraph(p_elem, doc)
                        text = para.text.strip()
                        if text:
                            text_parts.append(text)

            # 2. Extract all paragraphs preserving structure
            for para in doc.paragraphs:
                text = para.text.strip()
                if text:
                    # Add section markers for better parsing
                    if para.style.name in ['Title', 'Heading 1']:
                        text = f"\n\n=== {text} ===\n"
                    elif para.style.name in ['Heading 2', 'Heading 3']:
                        text = f"\n\n## {text} ##\n"

                    text_parts.append(text)

            # 3. Extract text from tables (some resumes use tables)
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        cell_text = cell.text.strip()
                        if cell_text:
                            text_parts.append(cell_text)

            return '\n'.join(text_parts)

        except Exception as e:
            logger.error(f"DOCX text extraction failed: {e}")
            raise

    def extract_header_links(self, docx_bytes: bytes) -> List[Dict[str, str]]:
        """Extract header links with actual URLs from DOCX"""
        try:
            doc = Document(BytesIO(docx_bytes))

            # Look for header links in first few paragraphs
            header_links = []
            for idx, para in enumerate(doc.paragraphs[:5]):
                # Skip name and contact line
                if idx <= 1:
                    continue

                # Extract hyperlinks from this paragraph
                links = self.extract_hyperlinks_from_para(para)
                if links:
                    header_links.extend(links)

            return header_links

        except Exception as e:
            logger.warning(f"Failed to extract header links: {e}")
            return []

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
            # Step 1: Extract header links with actual URLs from DOCX
            logger.info("Extracting header links from DOCX...")
            header_links = self.extract_header_links(docx_bytes)

            # Step 2: Extract text from DOCX
            logger.info("Extracting text from DOCX...")
            resume_text = self.extract_text_from_docx(docx_bytes)

            # Step 3: Send to OpenAI with structured output
            logger.info("Sending to OpenAI for parsing...")

            prompt = f"""
Extract all information from this resume into structured format.

INSTRUCTIONS:
- Identify sections by context (not just keywords)
- Extract ALL content exactly as written
- Maintain chronological order (newest first)
- For skills, group by logical categories
- Preserve dates exactly (e.g., "Sept 2025", "Present")
- For header_links: Extract any links/text in the header (LinkedIn, GitHub, Portfolio, etc.)
  * Extract the display text (e.g., "LinkedIn", "GitHub", "Medium")
  * These will be matched with actual URLs separately

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

            # Step 4: Get structured output (guaranteed valid!)
            resume_data = completion.choices[0].message.parsed
            result = resume_data.model_dump()

            # Step 5: Merge actual URLs from DOCX into header_links
            logger.info("Merging header links with extracted URLs...")
            if header_links:
                # Use the URLs from DOCX hyperlinks
                result['personal_info']['header_links'] = header_links

            logger.info("Resume extracted successfully")

            return result

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
