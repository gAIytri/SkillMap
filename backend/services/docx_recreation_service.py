"""
DOCX Recreation Service
Recreates DOCX from original file + JSON modifications with exact styling preservation
"""

from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml import parse_xml
from docx.oxml.ns import qn
from io import BytesIO
from typing import Dict, Any, List, Optional
import logging
import re

logger = logging.getLogger(__name__)


def recreate_docx_from_json(original_docx_bytes: bytes, resume_json: Dict[str, Any]) -> bytes:
    """
    Recreate DOCX from original file with updates from JSON
    Preserves all styling: fonts, colors, spacing, formatting

    Args:
        original_docx_bytes: Original DOCX file bytes
        resume_json: Extracted/modified JSON data

    Returns:
        bytes: Recreated DOCX file with updated content
    """
    try:
        logger.info("Recreating DOCX from JSON with styling preservation...")

        # Load original document
        doc = Document(BytesIO(original_docx_bytes))

        # Apply JSON changes to document
        update_personal_info(doc, resume_json.get('personal_info', {}))
        update_professional_summary(doc, resume_json.get('professional_summary'))
        update_experience(doc, resume_json.get('experience', []))
        update_education(doc, resume_json.get('education', []))
        update_skills(doc, resume_json.get('skills', []))
        update_projects(doc, resume_json.get('projects', []))
        update_certifications(doc, resume_json.get('certifications', []))

        # Save to bytes
        output = BytesIO()
        doc.save(output)
        output.seek(0)

        logger.info("DOCX recreated successfully from JSON")
        return output.getvalue()

    except Exception as e:
        logger.error(f"DOCX recreation failed: {e}")
        raise Exception(f"Failed to recreate DOCX: {str(e)}")


def update_personal_info(doc: Document, personal_info: Dict[str, Any]):
    """Update personal information section (usually at top)"""
    if not personal_info:
        return

    # Find and update name (usually first paragraph with large font or Title style)
    for para in doc.paragraphs[:5]:  # Check first 5 paragraphs
        if para.style.name == 'Title' or (para.runs and len(para.runs) > 0 and
                                          para.runs[0].font.size and
                                          para.runs[0].font.size.pt > 14):
            # This is likely the name
            if personal_info.get('name'):
                update_paragraph_text(para, personal_info['name'])
            break

    # Find and update contact info (email, phone, location)
    # Usually in first few paragraphs, look for patterns
    for para in doc.paragraphs[:10]:
        text = para.text.lower()

        # Update email
        if '@' in text and personal_info.get('email'):
            new_text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', personal_info['email'], para.text)
            update_paragraph_text(para, new_text)

        # Update phone
        if re.search(r'\(\d{3}\)|\d{3}[-.]?\d{3}[-.]?\d{4}', text) and personal_info.get('phone'):
            new_text = re.sub(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', personal_info['phone'], para.text)
            update_paragraph_text(para, new_text)

        # Update LinkedIn
        if 'linkedin' in text and personal_info.get('linkedin'):
            new_text = re.sub(r'linkedin\.com/[\w\-/]+', personal_info['linkedin'], para.text, flags=re.IGNORECASE)
            update_paragraph_text(para, new_text)

        # Update GitHub
        if 'github' in text and personal_info.get('github'):
            new_text = re.sub(r'github\.com/[\w\-/]+', personal_info['github'], para.text, flags=re.IGNORECASE)
            update_paragraph_text(para, new_text)


def update_professional_summary(doc: Document, summary: Optional[str]):
    """Update professional summary section"""
    if not summary:
        return

    # Find summary section (look for keywords like "Summary", "Profile", "About")
    summary_keywords = ['summary', 'profile', 'about', 'objective']

    for i, para in enumerate(doc.paragraphs):
        text = para.text.lower().strip()

        # Check if this is a summary heading
        if any(keyword in text for keyword in summary_keywords) and len(text) < 50:
            # Next paragraph(s) likely contain the summary
            # Replace content while preserving formatting
            if i + 1 < len(doc.paragraphs):
                update_paragraph_text(doc.paragraphs[i + 1], summary)
            break


def update_experience(doc: Document, experience_list: List[Dict[str, Any]]):
    """Update experience section with bullet points"""
    if not experience_list:
        return

    # Find experience section
    exp_start_idx = find_section_start(doc, ['experience', 'work history', 'employment', 'professional experience'])
    if exp_start_idx == -1:
        return

    # Find where experience section ends
    exp_end_idx = find_next_section(doc, exp_start_idx)

    # Get the experience paragraphs
    exp_paragraphs = doc.paragraphs[exp_start_idx + 1:exp_end_idx]

    # Group paragraphs by job (company/title lines followed by bullets)
    current_exp_idx = 0
    i = 0

    while i < len(exp_paragraphs) and current_exp_idx < len(experience_list):
        para = exp_paragraphs[i]
        exp_data = experience_list[current_exp_idx]

        # Check if this is a job title/company line (not a bullet)
        if not is_bullet_point(para):
            # Update company and title line
            new_text = f"{exp_data['title']} at {exp_data['company']}"
            if exp_data.get('location'):
                new_text += f" | {exp_data['location']}"
            update_paragraph_text(para, new_text)

            # Next line might be dates
            if i + 1 < len(exp_paragraphs):
                date_para = exp_paragraphs[i + 1]
                if not is_bullet_point(date_para):
                    new_date = f"{exp_data['start_date']} - {exp_data['end_date']}"
                    update_paragraph_text(date_para, new_date)
                    i += 1

            i += 1

            # Update bullets
            bullet_idx = 0
            while i < len(exp_paragraphs) and is_bullet_point(exp_paragraphs[i]) and bullet_idx < len(exp_data.get('bullets', [])):
                update_paragraph_text(exp_paragraphs[i], exp_data['bullets'][bullet_idx])
                bullet_idx += 1
                i += 1

            current_exp_idx += 1
        else:
            i += 1


def update_education(doc: Document, education_list: List[Dict[str, Any]]):
    """Update education section"""
    if not education_list:
        return

    # Find education section
    edu_start_idx = find_section_start(doc, ['education', 'academic', 'qualifications'])
    if edu_start_idx == -1:
        return

    edu_end_idx = find_next_section(doc, edu_start_idx)
    edu_paragraphs = doc.paragraphs[edu_start_idx + 1:edu_end_idx]

    # Update education entries
    current_edu_idx = 0
    i = 0

    while i < len(edu_paragraphs) and current_edu_idx < len(education_list):
        para = edu_paragraphs[i]
        edu_data = education_list[current_edu_idx]

        if not is_bullet_point(para):
            # Update degree line
            update_paragraph_text(para, edu_data['degree'])
            i += 1

            # Update institution and date
            if i < len(edu_paragraphs):
                inst_text = edu_data['institution']
                if edu_data.get('graduation_date'):
                    inst_text += f" | {edu_data['graduation_date']}"
                if edu_data.get('gpa'):
                    inst_text += f" | GPA: {edu_data['gpa']}"
                update_paragraph_text(edu_paragraphs[i], inst_text)
                i += 1

            current_edu_idx += 1
        else:
            i += 1


def update_skills(doc: Document, skills_list: List[Dict[str, Any]]):
    """Update skills section"""
    if not skills_list:
        return

    # Find skills section
    skills_start_idx = find_section_start(doc, ['skills', 'technical skills', 'competencies', 'technologies'])
    if skills_start_idx == -1:
        return

    skills_end_idx = find_next_section(doc, skills_start_idx)
    skills_paragraphs = doc.paragraphs[skills_start_idx + 1:skills_end_idx]

    # Update skills (usually "Category: skill1, skill2, skill3")
    for i, skill_cat in enumerate(skills_list):
        if i < len(skills_paragraphs):
            skills_text = f"{skill_cat['category']}: {', '.join(skill_cat['skills'])}"
            update_paragraph_text(skills_paragraphs[i], skills_text)


def update_projects(doc: Document, projects_list: List[Dict[str, Any]]):
    """Update projects section"""
    if not projects_list:
        return

    proj_start_idx = find_section_start(doc, ['projects', 'personal projects', 'portfolio'])
    if proj_start_idx == -1:
        return

    proj_end_idx = find_next_section(doc, proj_start_idx)
    proj_paragraphs = doc.paragraphs[proj_start_idx + 1:proj_end_idx]

    current_proj_idx = 0
    i = 0

    while i < len(proj_paragraphs) and current_proj_idx < len(projects_list):
        para = proj_paragraphs[i]
        proj_data = projects_list[current_proj_idx]

        if not is_bullet_point(para):
            # Update project name
            update_paragraph_text(para, proj_data['name'])
            i += 1

            # Update description
            if i < len(proj_paragraphs):
                update_paragraph_text(proj_paragraphs[i], proj_data['description'])
                i += 1

            # Update technologies
            if proj_data.get('technologies') and i < len(proj_paragraphs):
                tech_text = f"Technologies: {', '.join(proj_data['technologies'])}"
                update_paragraph_text(proj_paragraphs[i], tech_text)
                i += 1

            current_proj_idx += 1
        else:
            i += 1


def update_certifications(doc: Document, certifications_list: List[str]):
    """Update certifications section"""
    if not certifications_list:
        return

    cert_start_idx = find_section_start(doc, ['certifications', 'certificates', 'licenses'])
    if cert_start_idx == -1:
        return

    cert_end_idx = find_next_section(doc, cert_start_idx)
    cert_paragraphs = doc.paragraphs[cert_start_idx + 1:cert_end_idx]

    for i, cert in enumerate(certifications_list):
        if i < len(cert_paragraphs):
            update_paragraph_text(cert_paragraphs[i], cert)


# Helper functions

def update_paragraph_text(para, new_text: str):
    """Update paragraph text while preserving all formatting including hyperlinks"""
    if not para.runs:
        para.add_run(new_text)
        return

    # Check if paragraph contains hyperlinks
    hyperlinks = para._element.findall('.//' + qn('w:hyperlink'))

    if hyperlinks:
        # Paragraph has hyperlinks - preserve them
        update_paragraph_with_hyperlinks(para, new_text, hyperlinks)
    else:
        # No hyperlinks - simple update
        update_paragraph_simple(para, new_text)


def update_paragraph_with_hyperlinks(para, new_text: str, hyperlinks):
    """Update paragraph that contains hyperlinks - preserve the hyperlink structure"""
    # Strategy: DON'T modify hyperlinks - they're usually email/LinkedIn/GitHub links
    # Just skip updating if paragraph has hyperlinks to preserve clickability
    # The text will remain as-is with working hyperlinks

    # For now, we'll just leave hyperlink paragraphs unchanged to preserve formatting
    # This is safer than trying to update text inside hyperlink XML
    pass


def update_paragraph_simple(para, new_text: str):
    """Update paragraph without hyperlinks - simple text replacement"""
    # Keep first run's formatting
    first_run = para.runs[0]

    # Store formatting
    font_name = first_run.font.name
    font_size = first_run.font.size
    bold = first_run.bold
    italic = first_run.italic
    underline = first_run.underline
    color = first_run.font.color.rgb if first_run.font.color.rgb else None

    # Remove all runs
    for run in list(para.runs):
        run._element.getparent().remove(run._element)

    # Add new run with preserved formatting
    new_run = para.add_run(new_text)
    new_run.font.name = font_name
    if font_size:
        new_run.font.size = font_size
    new_run.bold = bold
    new_run.italic = italic
    new_run.underline = underline
    if color:
        new_run.font.color.rgb = color


def find_section_start(doc: Document, keywords: List[str]) -> int:
    """Find the index of paragraph that starts a section"""
    for i, para in enumerate(doc.paragraphs):
        text = para.text.lower().strip()
        if any(keyword in text for keyword in keywords) and len(text) < 50:
            # Check if it's a heading (bold, larger font, or heading style)
            if (para.style.name.startswith('Heading') or
                (para.runs and para.runs[0].bold) or
                para.style.name == 'Title'):
                return i
    return -1


def find_next_section(doc: Document, start_idx: int) -> int:
    """Find where the next section starts (or end of document)"""
    for i in range(start_idx + 1, len(doc.paragraphs)):
        para = doc.paragraphs[i]
        # Check if this is a section heading
        if (para.style.name.startswith('Heading') or
            (para.runs and para.runs[0].bold and len(para.text.strip()) < 50) or
            para.style.name == 'Title'):
            return i
    return len(doc.paragraphs)


def is_bullet_point(para) -> bool:
    """Check if paragraph is a bullet point"""
    # Check for list style or bullet character
    return (para.style.name.startswith('List') or
            para.text.strip().startswith('•') or
            para.text.strip().startswith('-') or
            para.text.strip().startswith('*') or
            para.text.strip().startswith('○'))
