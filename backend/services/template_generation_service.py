"""
Template Generation Service
Generates resume DOCX from template using user's data and custom section order
"""

from docxtpl import DocxTemplate
from io import BytesIO
from typing import Dict, Any, List
import logging
import os

logger = logging.getLogger(__name__)

# Template path
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), '..', 'templates', 'base_resume_template.docx')

# Default section order
DEFAULT_SECTION_ORDER = [
    'professional_summary',
    'experience',
    'projects',
    'education',
    'skills',
    'certifications'
]


def generate_resume_from_template(
    resume_json: Dict[str, Any],
    section_order: List[str] = None
) -> bytes:
    """
    Generate resume DOCX from template with custom section ordering

    Args:
        resume_json: Structured resume data (from extraction or tailoring)
        section_order: List of section names in desired order
                      Defaults to DEFAULT_SECTION_ORDER if not provided

    Returns:
        bytes: Generated DOCX file bytes

    Raises:
        FileNotFoundError: If template file doesn't exist
        Exception: If template rendering fails
    """
    try:
        logger.info("Generating resume from template...")

        # Validate template exists
        if not os.path.exists(TEMPLATE_PATH):
            raise FileNotFoundError(f"Template not found at: {TEMPLATE_PATH}")

        # Use default section order if not provided
        if section_order is None:
            section_order = DEFAULT_SECTION_ORDER.copy()
            logger.info(f"Using default section order: {section_order}")
        else:
            logger.info(f"Using custom section order: {section_order}")

        # Load template
        doc = DocxTemplate(TEMPLATE_PATH)

        # Prepare context for Jinja2 rendering
        context = prepare_template_context(resume_json, section_order)

        logger.info(f"Context keys: {list(context.keys())}")
        logger.info(f"Skills type: {type(context.get('skills'))}")
        if context.get('skills'):
            logger.info(f"First skill: {context.get('skills')[0]}")
            logger.info(f"Items type: {type(context.get('skills')[0].get('items'))}")

        # Render template
        try:
            doc.render(context)
        except Exception as e:
            logger.error(f"Rendering error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise

        # Save to bytes
        output = BytesIO()
        doc.save(output)
        output.seek(0)

        logger.info("✅ Resume generated successfully from template")
        return output.read()

    except FileNotFoundError as e:
        logger.error(f"Template file not found: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to generate resume from template: {e}")
        raise


def prepare_template_context(
    resume_json: Dict[str, Any],
    section_order: List[str]
) -> Dict[str, Any]:
    """
    Prepare context dictionary for Jinja2 template rendering

    Args:
        resume_json: Raw resume data
        section_order: Ordered list of sections

    Returns:
        dict: Context with all data formatted for template
    """
    # Extract data from resume_json
    personal_info = resume_json.get('personal_info', {})
    professional_summary = resume_json.get('professional_summary', '')
    experience = resume_json.get('experience', [])
    education = resume_json.get('education', [])
    skills = resume_json.get('skills', [])
    projects = resume_json.get('projects', [])
    certifications = resume_json.get('certifications', [])

    # Build context
    context = {
        'personal_info': personal_info,
        'professional_summary': professional_summary,
        'experience': experience,
        'education': education,
        'skills': skills,
        'projects': projects,
        'certifications': certifications,
        'sections': section_order  # This controls the order sections appear
    }

    logger.info(f"Template context prepared with {len(section_order)} sections")
    return context


def get_default_section_order() -> List[str]:
    """
    Get the default section order for new users

    Returns:
        list: Default section order
    """
    return DEFAULT_SECTION_ORDER.copy()


def validate_section_order(section_order: List[str]) -> bool:
    """
    Validate that section order contains valid section names

    Args:
        section_order: List of section names to validate

    Returns:
        bool: True if valid, False otherwise
    """
    valid_sections = set(DEFAULT_SECTION_ORDER)
    provided_sections = set(section_order)

    # Check if all provided sections are valid
    if not provided_sections.issubset(valid_sections):
        invalid = provided_sections - valid_sections
        logger.warning(f"Invalid sections in section_order: {invalid}")
        return False

    return True


# For backward compatibility and testing
if __name__ == '__main__':
    # Test with sample data
    sample_resume = {
        'personal_info': {
            'name': 'Test User',
            'email': 'test@example.com',
            'phone': '(123) 456-7890',
            'location': 'New York, NY',
            'linkedin': 'linkedin.com/in/testuser',
            'github': 'github.com/testuser'
        },
        'professional_summary': 'Experienced developer with expertise in full-stack development.',
        'experience': [
            {
                'company': 'Tech Corp',
                'title': 'Software Engineer',
                'location': 'New York, NY',
                'start_date': 'Jan 2020',
                'end_date': 'Present',
                'bullets': [
                    'Developed scalable web applications',
                    'Led team of 5 developers'
                ]
            }
        ],
        'education': [
            {
                'institution': 'University of Test',
                'degree': 'B.S. in Computer Science',
                'location': 'Test City, ST',
                'graduation_date': 'May 2020',
                'gpa': '3.8'
            }
        ],
        'skills': [
            {'category': 'Languages', 'skills': ['Python', 'JavaScript', 'TypeScript']},
            {'category': 'Frontend', 'skills': ['React', 'Next.js']}
        ],
        'projects': [
            {
                'name': 'Test Project',
                'technologies': 'React, Node.js',
                'end_date': 'Dec 2024',
                'description': ['Built a web application', 'Deployed to AWS']
            }
        ],
        'certifications': [
            {'name': 'AWS Certified Developer', 'issuer': 'Amazon', 'date': '2023'}
        ]
    }

    try:
        output = generate_resume_from_template(sample_resume)
        print(f"✅ Test successful! Generated {len(output)} bytes")
    except Exception as e:
        print(f"❌ Test failed: {e}")
