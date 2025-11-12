"""
Resume Tailoring Service
Tailors resume JSON based on job description using OpenAI
"""

from openai import OpenAI
from typing import Dict, Any
import logging
import json
from config.settings import settings

logger = logging.getLogger(__name__)


def tailor_resume(resume_json: Dict[str, Any], job_description: str, api_key: str = None) -> Dict[str, Any]:
    """
    Tailor resume JSON based on job description

    Process:
    1. Extract job requirements from JD (tech stack, experience, skills)
    2. Update resume JSON by:
       - Restructuring/improving grammar of bullet points
       - Reorganizing skills presentation
       - Quantifying work experience where possible
       - Updating professional summary
    3. IMPORTANT: Do NOT add fake projects or skills

    Args:
        resume_json: Extracted resume data in JSON format
        job_description: Job description text to tailor resume against
        api_key: OpenAI API key (optional, uses env variable if not provided)

    Returns:
        dict: Tailored resume JSON with same structure
    """
    try:
        logger.info("Starting resume tailoring process...")

        # Initialize OpenAI client
        client = OpenAI(api_key=api_key or settings.OPENAI_API_KEY)

        # Create tailoring prompt
        system_prompt = """You are an expert technical resume tailoring assistant specializing in software engineering and tech roles. You will receive a resume extraction in JSON format and need to optimize it for a specific job description.

CORE PRINCIPLES:
1. Work ONLY with existing information - NEVER fabricate projects, skills, or experience
2. Make SUBSTANTIAL improvements - don't just tweak, transform the content
3. Use highly technical language appropriate for the role
4. Maintain the EXACT same JSON structure for recreation
5. Every change must be impactful and relevant to the job description

YOUR EXPERTISE:
- Transform basic bullet points into achievement-focused, quantified statements
- Reorganize content by relevance to job requirements
- Enhance technical descriptions while staying within technology boundaries
- Optimize language for ATS (Applicant Tracking Systems) and human reviewers"""

        # Convert resume_json to pretty JSON string
        resume_json_str = json.dumps(resume_json, indent=2)

        user_prompt = f"""JOB DESCRIPTION:
{job_description}

CURRENT RESUME (JSON EXTRACTION):
{resume_json_str}

TAILORING INSTRUCTIONS:

1. PROFESSIONAL SUMMARY (paragraph format):
   - Rewrite to directly address the job requirements
   - Highlight most relevant skills and experience from the resume
   - Use strong, confident language
   - Keep as a single paragraph (3-4 sentences)
   - Make it compelling and role-specific

2. WORK EXPERIENCE BULLET POINTS (CRITICAL - MAJOR CHANGES NEEDED):
   - Transform EVERY bullet point to be more technical and impactful
   - Use strong action verbs (Architected, Engineered, Optimized, Implemented, Led, Designed)
   - Add technical depth: mention frameworks, tools, methodologies, scale
   - Quantify impact: performance improvements, user numbers, efficiency gains, code coverage
   - Follow format: [Action Verb] + [What] + [How/Technology] + [Impact/Result]
   - Example transformation:
     BEFORE: "Worked on user authentication feature"
     AFTER: "Architected secure JWT-based authentication system using Node.js and Redis, reducing login latency by 40% for 50K+ daily active users"
   - Make each bullet technical, specific, and achievement-focused
   - Prioritize bullets that align with job requirements

3. PROJECTS (REORGANIZE + ENHANCE):
   - REORDER projects: Most relevant to JD should come FIRST
   - Enhance descriptions with technical depth:
     * Specify architecture patterns (microservices, MVC, serverless, etc.)
     * Mention scale/complexity (user count, data volume, API calls)
     * Add technical challenges solved
     * Highlight relevant technologies from JD
   - Keep within the boundaries of listed technologies
   - Make descriptions compelling and detailed
   - Example enhancement:
     BEFORE: "Built a food delivery app with React and Node.js"
     AFTER: "Engineered full-stack food delivery platform using React, Redux, and Node.js with MongoDB, supporting 1000+ daily orders through optimized real-time order tracking and payment integration via Stripe API"

4. SKILLS (REORGANIZE BY RELEVANCE):
   - Analyze JD for required/preferred skills
   - REORDER each skill category to put JD-matching skills FIRST
   - Within each category, prioritize based on job requirements
   - Keep all existing skills (don't remove or add)
   - Example: If JD requires "React, TypeScript, AWS", these should appear first in their categories

5. EDUCATION:
   - Keep as-is unless GPA/honors should be highlighted for the role
   - Mention relevant coursework if applicable to JD

6. CERTIFICATIONS:
   - Keep as-is

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching the exact structure provided
- Every section must be present with same field names
- No additional fields or missing fields
- Professional summary must be a single paragraph string
- All arrays must maintain same structure (experience, projects, skills, etc.)
- Ensure all quotes are properly escaped in JSON

Make the changes SUBSTANTIAL and IMPACTFUL. This is a critical job application."""

        # Call OpenAI
        logger.info("Calling OpenAI for tailoring...")
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,  # Slightly higher for more creative enhancements
            max_tokens=4096,  # Allow for detailed responses
            response_format={"type": "json_object"}  # Ensure JSON response
        )

        # Extract tailored JSON
        tailored_json_str = response.choices[0].message.content

        # Parse JSON
        tailored_json = json.loads(tailored_json_str)

        logger.info("Resume tailored successfully")
        return tailored_json

    except Exception as e:
        logger.error(f"Resume tailoring failed: {e}")
        raise Exception(f"Failed to tailor resume: {str(e)}")
