"""
DOCX Generation Service - Pure python-docx Programmatic Approach
Generates resume DOCX from JSON data with full styling control
No templates, no Jinja2 - just clean, reliable document building
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from io import BytesIO
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# STYLE CONFIGURATION (matching your resume exactly)
# ============================================================================

# Global spacing configuration (in Pt)
SECTION_SPACING_BEFORE = 5  # Space before each section header (reduced for tighter spacing)
SECTION_SPACING_AFTER = 2   # Space after each section header (NO gap after underline)

STYLES = {
    'contact': {
        'style': 'Normal',
        'alignment': WD_ALIGN_PARAGRAPH.CENTER,
        'font_size': 10,
    },
    'section_header': {
        'style': 'Heading 1',
        'underline': True,
    },
    'job_header': {
        'style': 'Heading 2',
    },
    'bullet': {
        'style': 'List Paragraph',
        'font_size': 9,
    },
    'normal': {
        'style': 'Normal',
        'font_size': 10,
    },
    'education_school': {
        'style': 'Normal',
        'font_size': 10,
        'bold': True,
        'alignment': WD_ALIGN_PARAGRAPH.JUSTIFY,
    },
    'education_degree': {
        'style': 'Normal',
        'font_size': 10,
        'italic': True,
        'alignment': WD_ALIGN_PARAGRAPH.LEFT,
    },
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def sanitize_text(text: str) -> str:
    """
    Remove invalid XML characters from text

    Args:
        text: Input text that may contain invalid characters

    Returns:
        Sanitized text safe for XML/DOCX
    """
    if not text:
        return ""

    # Remove null bytes and control characters (except newline, carriage return, tab)
    import re
    # Keep only valid XML characters
    # Valid: \x09 (tab), \x0A (LF), \x0D (CR), \x20-\uD7FF, \uE000-\uFFFD
    return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)


def add_hyperlink(paragraph, text: str, url: str, size: int = 10, color: RGBColor = None):
    """
    Add a clickable hyperlink to a paragraph

    Args:
        paragraph: Paragraph object
        text: Display text
        url: URL to link to
        size: Font size in points
        color: Font color (RGBColor object)
    """
    # This gets access to the document.xml.rels file
    part = paragraph.part
    r_id = part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)

    # Create the hyperlink element
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)

    # Create a new run for the hyperlink text
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')

    # Set hyperlink style (blue + underline)
    if color:
        c = OxmlElement('w:color')
        # RGBColor is a tuple (r, g, b), not an object with .r, .g, .b
        c.set(qn('w:val'), '%02x%02x%02x' % (color[0], color[1], color[2]))
        rPr.append(c)

    u = OxmlElement('w:u')
    u.set(qn('w:val'), 'single')
    rPr.append(u)

    # Set font size
    if size:
        sz = OxmlElement('w:sz')
        sz.set(qn('w:val'), str(size * 2))  # Word uses half-points
        rPr.append(sz)

    new_run.append(rPr)

    # Add text
    text_elem = OxmlElement('w:t')
    text_elem.text = text
    new_run.append(text_elem)

    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)

    return hyperlink


def add_bullet_paragraph(doc: Document, text: str, font_size: int = 9):
    """
    Add a bulleted paragraph with visible bullet points (•)

    Args:
        doc: Document object
        text: Bullet text
        font_size: Font size in points (default 9)
    """
    # Create paragraph and add bullet character directly
    para = doc.add_paragraph()

    # Add bullet character (•) followed by text
    run = para.add_run(f"• {sanitize_text(text)}")
    run.font.size = Pt(font_size)
    run.font.name = 'Calibri'

    # Set hanging indent for bullet alignment
    para.paragraph_format.left_indent = Inches(0.12)
    para.paragraph_format.first_line_indent = Inches(-0.10)

    # Ensure no extra spacing
    para.paragraph_format.space_before = Pt(0)
    para.paragraph_format.space_after = Pt(0)
    para.paragraph_format.line_spacing = 1.0  # Single line spacing

    return para


def add_header_section(doc: Document, personal_info: Dict[str, Any]):
    """
    Add header section with name and contact info

    Format:
    NAME (centered, Title style)
    location | email | phone (centered, 10pt)
    LinkedIn | GitHub | Portfolio (centered, 10pt, blue links)
    """
    # Name - manually formatted instead of using 'Title' style
    name_para = doc.add_paragraph()
    name_run = name_para.add_run(sanitize_text(personal_info.get('name', '')))
    name_run.font.size = Pt(18)
    name_run.font.bold = True
    name_run.font.name = 'Calibri'
    name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_para.paragraph_format.space_after = Pt(0)  # NO gap below name

    # Contact line (pipe-separated)
    contact_parts = []
    if personal_info.get('location'):
        contact_parts.append(personal_info['location'])
    if personal_info.get('email'):
        contact_parts.append(personal_info['email'])
    if personal_info.get('phone'):
        contact_parts.append(personal_info['phone'])

    if contact_parts:
        contact_para = doc.add_paragraph()
        contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_para.paragraph_format.space_before = Pt(0)
        contact_para.paragraph_format.space_after = Pt(0)
        contact_run = contact_para.add_run(' | '.join(contact_parts))
        contact_run.font.size = Pt(10)
        contact_run.font.name = 'Calibri'

    # Links line (pipe-separated, blue hyperlinks)
    # Use generic header_links (completely dynamic)
    header_links = personal_info.get('header_links', [])

    if header_links:
        links_para = doc.add_paragraph()
        links_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        links_para.paragraph_format.space_before = Pt(0)
        links_para.paragraph_format.space_after = Pt(0)

        for idx, link in enumerate(header_links):
            text = link.get('text', '')
            url = link.get('url', None)

            if not text:
                continue

            # Add separator if not first link
            if idx > 0:
                separator_run = links_para.add_run(' | ')
                separator_run.font.size = Pt(10)
                separator_run.font.name = 'Calibri'

            # Create hyperlink if URL exists, otherwise plain text
            if url:
                # Add clickable hyperlink
                add_hyperlink(links_para, text, url, size=10, color=RGBColor(0, 0, 255))
            else:
                # Add plain text (blue color for consistency)
                link_run = links_para.add_run(text)
                link_run.font.size = Pt(10)
                link_run.font.color.rgb = RGBColor(0, 0, 255)


def add_section_header(doc: Document, title: str):
    """Add section header with underline (e.g., PROFESSIONAL SUMMARY)"""
    # Create plain paragraph WITHOUT Heading1 style to avoid built-in spacing
    # All formatting (bold, size, font, underline) is applied manually below
    para = doc.add_paragraph()

    # Add title text as a run
    run = para.add_run(title)
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.name = 'Calibri'

    # Ensure header starts at content area edge (no additional indent)
    para.paragraph_format.left_indent = Inches(0)
    para.paragraph_format.first_line_indent = Inches(0)

    # Add spacing before section, NO spacing after
    para.paragraph_format.space_before = Pt(SECTION_SPACING_BEFORE)
    para.paragraph_format.space_after = Pt(SECTION_SPACING_AFTER)  # NO GAP after underline
    para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE  # Force exact single spacing

    # Add bottom border (underline effect for the entire paragraph)
    # The border will extend full width of the content area (between margins)
    pPr = para._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')  # Border thickness
    bottom.set(qn('w:space'), '0')  # No spacing - border goes edge to edge
    bottom.set(qn('w:color'), 'auto')
    pBdr.append(bottom)
    pPr.append(pBdr)

    # Force paragraph to span full width by setting indentation explicitly
    # This ensures the border extends edge-to-edge within margins
    pPr_ind = para._p.get_or_add_pPr()
    ind = OxmlElement('w:ind')
    ind.set(qn('w:left'), '0')
    ind.set(qn('w:right'), '0')
    pPr_ind.append(ind)


def add_professional_summary(doc: Document, summary: str):
    """Add professional summary section"""
    if not summary:
        return

    add_section_header(doc, 'PROFESSIONAL SUMMARY')

    summary_para = doc.add_paragraph(sanitize_text(summary))
    summary_para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY  # JUSTIFY aligned (both left and right edges)
    summary_para.paragraph_format.left_indent = Inches(0)
    summary_para.paragraph_format.first_line_indent = Inches(0)
    summary_para.paragraph_format.space_before = Pt(0)  # NO gap after underline
    summary_para.paragraph_format.space_after = Pt(0)
    summary_para.paragraph_format.line_spacing = 1.0  # Single line spacing
    if summary_para.runs:
        summary_para.runs[0].font.size = Pt(10)
        summary_para.runs[0].font.name = 'Calibri'


def add_education_section(doc: Document, education: List[Dict[str, Any]]):
    """
    Add education section

    Format:
    EDUCATION (Heading 1, underlined)
    Institution, Location (Normal, 10pt, bold)
    Degree – GPA: X.X    Date (Normal, 10pt, italic, right-aligned)
    """
    if not education:
        return

    add_section_header(doc, 'EDUCATION')

    for edu in education:
        # School name and location (bold) with date on same line
        school_parts = [edu.get('institution', '')]
        if edu.get('location'):
            school_parts.append(edu['location'])

        school_para = doc.add_paragraph(style='Normal')
        school_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
        # Explicitly set indents to 0 to align with section header
        school_para.paragraph_format.left_indent = Pt(1)
        school_para.paragraph_format.first_line_indent = Inches(0)
        school_para.paragraph_format.space_before = Pt(0)
        school_para.paragraph_format.space_after = Pt(0)
        school_para.paragraph_format.line_spacing = 1.0  # Single line spacing

        # Add school name and location (bold)
        school_run = school_para.add_run(', '.join(school_parts))
        school_run.font.bold = True
        school_run.font.size = Pt(10)

        # Add date on right side with tab (SAME line as school, at underline end)
        if edu.get('graduation_date'):
            tab_stops = school_para.paragraph_format.tab_stops
            tab_stops.add_tab_stop(Inches(7.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)

            # Add tab and date (bold to match original resume)
            date_run = school_para.add_run(f"\t{edu['graduation_date']}")
            date_run.font.bold = True
            date_run.font.size = Pt(10)

        # Degree line (italic) - NO date on this line
        degree_parts = [edu.get('degree', '')]
        if edu.get('gpa'):
            degree_parts.append(f"– GPA: {edu['gpa']}")

        degree_para = doc.add_paragraph(style='Normal')
        degree_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
        # Explicitly set indents to 0 to align with section header
        degree_para.paragraph_format.left_indent = Inches(0)
        degree_para.paragraph_format.first_line_indent = Inches(0)
        degree_para.paragraph_format.space_before = Pt(0)
        degree_para.paragraph_format.space_after = Pt(0)
        degree_para.paragraph_format.line_spacing = 1.0  # Single line spacing

        # Add degree text (italic, no date)
        degree_run = degree_para.add_run(' '.join(degree_parts))
        degree_run.font.italic = True
        degree_run.font.size = Pt(10)


def add_experience_section(doc: Document, experience: List[Dict[str, Any]]):
    """
    Add experience section

    Format:
    EXPERIENCE (Heading 1, underlined)
    Company – Title, Location    Start – End (Heading 2, date right-aligned)
    • Bullet 1 (List Paragraph, 9pt)
    • Bullet 2
    """
    if not experience:
        return

    add_section_header(doc, 'EXPERIENCE')

    for idx, exp in enumerate(experience):
        # Job header (Heading 2)
        company = exp.get('company', '')
        title = exp.get('title', '')
        location = exp.get('location', '')
        start_date = exp.get('start_date', '')
        end_date = exp.get('end_date', '')

        # Format: "Company – Title, Location"
        job_header_parts = []
        if company and title:
            job_header_parts.append(f"{company} – {title}")
        elif company:
            job_header_parts.append(company)

        if location:
            job_header_parts.append(location)

        # Create plain paragraph WITHOUT Heading2 style to avoid built-in spacing
        # All formatting (bold, size, font) is applied manually below
        job_para = doc.add_paragraph()

        # Explicitly set indents to 0 to align with section header
        job_para.paragraph_format.left_indent = Pt(1)
        job_para.paragraph_format.first_line_indent = Inches(0)
        # First item: NO gap after section underline. Subsequent items: add minimal spacing
        job_para.paragraph_format.space_before = Pt(2) if idx == 0 else Pt(6)
        job_para.paragraph_format.space_after = Pt(0)  # NO gap after job header
        job_para.paragraph_format.line_spacing = 1.0  # Single line spacing
        job_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE  # Force exact single spacing

        # Add job header text
        job_text = ', '.join(job_header_parts) if job_header_parts else ''
        if job_text:
            run = job_para.add_run(job_text)
            run.font.bold = True
            run.font.size = Pt(11)
            run.font.name = 'Calibri'

        # Add dates on right side at end of line
        if start_date and end_date:
            # Add right-aligned tab stop at 7.5 inches (page width 8.5 - left 0.5 - right 0.5 = 7.5)
            tab_stops = job_para.paragraph_format.tab_stops
            tab_stops.add_tab_stop(Inches(7.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)

            # Add tab and dates
            date_run = job_para.add_run(f"\t{start_date} – {end_date}")
            date_run.font.bold = True
            date_run.font.size = Pt(11)
            date_run.font.name = 'Calibri'

        # Bullets (List Paragraph, 9pt)
        bullets = exp.get('bullets', [])
        for bullet in bullets:
            add_bullet_paragraph(doc, bullet, font_size=9)


def add_projects_section(doc: Document, projects: List[Dict[str, Any]]):
    """
    Add projects section

    Format:
    PROJECTS (Heading 1, underlined)
    Project Name – Technologies    Date (Heading 2)
    • Description bullet 1 (List Paragraph, 9pt)
    • Description bullet 2
    """
    if not projects:
        return

    add_section_header(doc, 'PROJECTS')

    for idx, project in enumerate(projects):
        # Project header (Heading 2) with date on right
        name = project.get('name', '')
        technologies = project.get('technologies', [])
        link = project.get('link', '')
        date = project.get('date', '')

        # Format: "Project Name – Technologies (parenthetical)"
        project_header = name

        # Add technologies if available (in parentheses for consistency with original)
        if technologies:
            if isinstance(technologies, list):
                tech_str = ', '.join(technologies)
            else:
                tech_str = str(technologies)
            project_header += f" ({tech_str})"

        # Create plain paragraph WITHOUT Heading2 style to avoid built-in spacing
        # All formatting (bold, size, font) is applied manually below
        project_para = doc.add_paragraph()

        # Explicitly set indents to 0 to align with section header
        project_para.paragraph_format.left_indent = Pt(1)
        project_para.paragraph_format.first_line_indent = Inches(0)
        # First item: NO gap after section underline. Subsequent items: add minimal spacing
        project_para.paragraph_format.space_before = Pt(0) if idx == 0 else Pt(4)
        project_para.paragraph_format.space_after = Pt(0)  # NO gap after project header
        project_para.paragraph_format.line_spacing = 1.0  # Single line spacing
        project_para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE  # Force exact single spacing

        # Add project name and technologies
        run = project_para.add_run(sanitize_text(project_header))
        run.font.bold = True
        run.font.size = Pt(11)
        run.font.name = 'Calibri'

        # Add date on right side at end of line
        if date:
            tab_stops = project_para.paragraph_format.tab_stops
            tab_stops.add_tab_stop(Inches(7.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)

            # Add tab and date
            date_run = project_para.add_run(f"\t{date}")
            date_run.font.bold = True
            date_run.font.size = Pt(11)
            date_run.font.name = 'Calibri'

        # Description - split by period into separate bullets
        description = project.get('description', '')

        def split_into_sentences(text: str) -> List[str]:
            """
            Split text into sentences, handling abbreviations like e.g., i.e., etc.
            """
            import re
            # Replace common abbreviations with placeholders
            text = text.replace('e.g.', 'EG_PLACEHOLDER')
            text = text.replace('i.e.', 'IE_PLACEHOLDER')
            text = text.replace('etc.', 'ETC_PLACEHOLDER')

            # Split by period followed by space or end of string
            sentences = re.split(r'\.\s+', text)

            # Restore abbreviations and clean up
            result = []
            for sentence in sentences:
                sentence = sentence.replace('EG_PLACEHOLDER', 'e.g.')
                sentence = sentence.replace('IE_PLACEHOLDER', 'i.e.')
                sentence = sentence.replace('ETC_PLACEHOLDER', 'etc.')
                sentence = sentence.strip()

                if sentence:
                    # Add period back if it doesn't end with one
                    if not sentence.endswith('.'):
                        sentence += '.'
                    result.append(sentence)

            return result

        if isinstance(description, str):
            # Split by sentence and create separate bullets
            sentences = split_into_sentences(description)
            for sentence in sentences:
                add_bullet_paragraph(doc, sentence, font_size=9)
        elif isinstance(description, list):
            # Already a list of bullets
            for desc in description:
                sentences = split_into_sentences(desc)
                for sentence in sentences:
                    add_bullet_paragraph(doc, sentence, font_size=9)


def add_skills_section(doc: Document, skills: List[Dict[str, Any]]):
    """
    Add technical skills section

    Format:
    TECHNICAL SKILLS (Heading 1, underlined)
    Category: skill1, skill2, skill3 (Normal, 10pt, bold category)
    """
    if not skills:
        return

    add_section_header(doc, 'TECHNICAL SKILLS')

    for skill_cat in skills:
        category = skill_cat.get('category', '')
        skill_items = skill_cat.get('skills', [])

        if category and skill_items:
            skill_para = doc.add_paragraph(style='Normal')
            skill_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            # Explicitly set indents to 0 to align with section header
            skill_para.paragraph_format.left_indent = Pt(1)
            skill_para.paragraph_format.first_line_indent = Inches(0)
            skill_para.paragraph_format.space_before = Pt(0)
            skill_para.paragraph_format.space_after = Pt(0)
            skill_para.paragraph_format.line_spacing = 1.0  # Single line spacing

            # Category (bold)
            cat_run = skill_para.add_run(f"{category}: ")
            cat_run.font.bold = True
            cat_run.font.size = Pt(10)

            # Skills (normal)
            skills_text = ', '.join(skill_items) if isinstance(skill_items, list) else str(skill_items)
            items_run = skill_para.add_run(skills_text)
            items_run.font.size = Pt(10)


def add_certifications_section(doc: Document, certifications: List[str]):
    """
    Add certifications section

    Format:
    CERTIFICATIONS (Heading 1, underlined)
    • Certification 1 (List Paragraph, 9pt)
    • Certification 2
    """
    if not certifications:
        return

    add_section_header(doc, 'CERTIFICATIONS')

    for cert in certifications:
        add_bullet_paragraph(doc, cert, font_size=9)


# ============================================================================
# MAIN GENERATION FUNCTION
# ============================================================================

def generate_resume_from_json(
    resume_json: Dict[str, Any],
    base_resume_docx: bytes = None,
    section_order: List[str] = None
) -> bytes:
    """
    Generate resume DOCX from JSON data programmatically

    Args:
        resume_json: Extracted resume data (matches ResumeData schema)
        base_resume_docx: Original resume DOCX as bytes (for style reference)
                         If None, creates new document with default styles
        section_order: Custom order for sections
                      Default: ['professional_summary', 'experience', 'projects',
                               'education', 'skills', 'certifications']

    Returns:
        bytes: Generated DOCX file as bytes
    """
    try:
        # Load base resume as style reference (or create new document)
        if base_resume_docx:
            logger.info("Loading style reference from base resume bytes")

            # Load the original document
            temp_doc = Document(BytesIO(base_resume_docx))

            # Clear all existing content
            for para in temp_doc.paragraphs[:]:
                p = para._element
                p.getparent().remove(p)

            # Save to bytes to refresh the document structure
            temp_output = BytesIO()
            temp_doc.save(temp_output)
            temp_output.seek(0)

            # Reload the cleared document (this preserves styles properly)
            doc = Document(temp_output)

            # Set ALL margins to 0.5 inch and page size to US Letter
            section = doc.sections[0]
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.5)
            section.right_margin = Inches(0.5)

            # Set page size to US Letter (8.5" × 11")
            section.page_width = Inches(8.5)
            section.page_height = Inches(11)

            # Log the margins for debugging
            logger.info(f"Document margins - Top: {section.top_margin.inches}\", Bottom: {section.bottom_margin.inches}\", Left: {section.left_margin.inches}\", Right: {section.right_margin.inches}\"")

            logger.info("Cleared existing content, preserving styles and page setup")
        else:
            logger.warning("No base resume provided - creating new document with default styles")
            logger.warning("Generated document may not have exact formatting")
            doc = Document()

            # Ensure required styles exist
            # Note: This is a fallback - results won't be as good as using original resume
            pass

        # Default section order
        if section_order is None:
            section_order = [
                'professional_summary',
                'experience',
                'projects',
                'education',
                'skills',
                'certifications'
            ]

        # Build resume programmatically
        logger.info("Building resume from JSON data...")

        # 1. Header (always first)
        personal_info = resume_json.get('personal_info', {})
        add_header_section(doc, personal_info)

        # 2. Add sections in custom order
        section_builders = {
            'professional_summary': lambda: add_professional_summary(
                doc,
                resume_json.get('professional_summary', '')
            ),
            'education': lambda: add_education_section(
                doc,
                resume_json.get('education', [])
            ),
            'experience': lambda: add_experience_section(
                doc,
                resume_json.get('experience', [])
            ),
            'projects': lambda: add_projects_section(
                doc,
                resume_json.get('projects', [])
            ),
            'skills': lambda: add_skills_section(
                doc,
                resume_json.get('skills', [])
            ),
            'certifications': lambda: add_certifications_section(
                doc,
                resume_json.get('certifications', [])
            ),
        }

        # Build sections in order
        for section_name in section_order:
            if section_name in section_builders:
                section_builders[section_name]()

        # Save to bytes
        output = BytesIO()
        doc.save(output)
        output.seek(0)

        logger.info("Resume generated successfully")
        return output.read()

    except Exception as e:
        logger.error(f"Resume generation failed: {e}")
        raise Exception(f"Failed to generate resume: {str(e)}")


# ============================================================================
# HELPER FUNCTION - Get Default Section Order
# ============================================================================

def get_default_section_order() -> List[str]:
    """Get default section order"""
    return [
        'professional_summary',
        'experience',
        'projects',
        'education',
        'skills',
        'certifications'
    ]


# ============================================================================
# MAIN - For Testing
# ============================================================================

if __name__ == '__main__':
    """Test resume generation"""

    # Sample data
    test_data = {
        "personal_info": {
            "name": "SIDHARTH RAJ KHANDELWAL",
            "email": "sid_rk@outlook.com",
            "phone": "(480) 241-8791",
            "location": "Jersey City, NJ",
            "linkedin": "LinkedIn",
            "github": "GitHub",
            "portfolio": "Portfolio"
        },
        "professional_summary": "AI driven Full Stack Developer with 4+ years of experience specializing in React, TypeScript, .NET, Python.",
        "education": [
            {
                "institution": "Pace University",
                "location": "New York, NY",
                "degree": "M.S. in Computer Science (Full Stack Development)",
                "gpa": "3.9",
                "graduation_date": "May 2025"
            }
        ],
        "experience": [
            {
                "company": "We Rebel LLC",
                "title": "Full-Stack Developer",
                "location": "New York, NY",
                "start_date": "Sept 2025",
                "end_date": "Present",
                "bullets": [
                    "Led end-to-end development of Common Works Registration pipeline.",
                    "Integrated Persona identity verification for artist onboarding."
                ]
            }
        ],
        "projects": [],
        "skills": [
            {
                "category": "Languages",
                "skills": ["TypeScript", "JavaScript", "Python", "C#", "SQL"]
            }
        ],
        "certifications": []
    }

    # Generate resume
    base_path = '/Users/sidharthraj/Gaiytri projects/SkillMap/SidharthRaj_Khandelwal-2.docx'
    output_bytes = generate_resume_from_json(test_data, base_path)

    print(f"✅ Test successful! Generated {len(output_bytes)} bytes")
    print(f"   Using base resume: {base_path}")
